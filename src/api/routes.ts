import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EditDecisionSchema, type EditDecision } from "../schemas/editDecision.schema";
import { RendererService } from "../services/renderer.service";
import { RenderJobService } from "../services/renderJob.service";
import { DecisionEngine } from "../services/decisionEngine";
import { getRenderSignedUrl } from "../../server/lib/supabaseStorage";
import type { CaptionStyleSpec } from "../captions/styleSpec";
import type { EDL } from "../remotion/types/edl";

let _generatedStyles: CaptionStyleSpec[] | null = null;
function loadGeneratedStyles(): CaptionStyleSpec[] {
  if (_generatedStyles) return _generatedStyles;
  try {
    const jsonPath = path.resolve(process.cwd(), "src/captions/styles/generated.json");
    const raw = fs.readFileSync(jsonPath, "utf-8");
    _generatedStyles = JSON.parse(raw) as CaptionStyleSpec[];
    return _generatedStyles;
  } catch {
    _generatedStyles = [];
    return [];
  }
}

function resolveStyleSpec(styleId: string): CaptionStyleSpec | undefined {
  const styles = loadGeneratedStyles();
  return styles.find((s) => s.id === styleId);
}

export const renderRouter = Router();

renderRouter.post("/api/render/enqueue", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { videoId, edl, watermark, style } = req.body;

    if (!videoId || !edl) {
      return res.status(400).json({ error: "videoId and edl are required" });
    }

    const parseResult = EditDecisionSchema.safeParse(edl);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid EDL payload",
        details: parseResult.error.flatten(),
      });
    }

    const finalEdl: any = parseResult.data;
    let captionStyleSpec: CaptionStyleSpec | undefined;

    if (style?.captionTemplateId) {
      captionStyleSpec = resolveStyleSpec(style.captionTemplateId);
      if (finalEdl.tracks.captions) {
        finalEdl.tracks.captions = finalEdl.tracks.captions.map((cap: any) => ({
          ...cap,
          stylePackId: style.captionTemplateId,
        }));
      }
    }
    if (style?.colorPreset && finalEdl.tracks.video) {
      finalEdl.tracks.video = finalEdl.tracks.video.map((seg: any) => ({
        ...seg,
        colorPreset: style.colorPreset,
      }));
    }

    if (captionStyleSpec) {
      finalEdl.captionStyleSpec = captionStyleSpec;
    }

    let job;
    try {
      job = await RenderJobService.enqueue(
        user.id,
        videoId,
        finalEdl,
        watermark ?? true
      );
    } catch (err: any) {
      if (err.message?.includes("not found or not owned")) {
        return res.status(404).json({ error: "Video not found" });
      }
      throw err;
    }

    console.log(`[RenderAPI] Enqueued render job ${job.id} for video ${videoId}`);

    res.status(201).json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
    });
  } catch (error: any) {
    console.error("[RenderAPI] Enqueue failed:", error);
    res.status(500).json({ error: "Failed to enqueue render job" });
  }
});

renderRouter.get("/api/render/jobs/:jobId", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const jobId = req.params.jobId as string;
    const job = await RenderJobService.getJob(jobId, user.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const result: any = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      videoId: job.videoId,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };

    if (job.status === "failed") {
      result.error = job.lastError;
    }

    if (job.status === "completed" && job.outputPath) {
      try {
        const signedUrl = await getRenderSignedUrl(job.outputPath);
        result.downloadUrl = signedUrl;
      } catch (err) {
        console.warn("[RenderAPI] Could not generate signed URL:", err);
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error("[RenderAPI] Get job failed:", error);
    res.status(500).json({ error: "Failed to get job status" });
  }
});

renderRouter.get("/api/render/jobs", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const jobs = await RenderJobService.getJobsForUser(user.id);

    res.json(
      jobs.map((job) => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        videoId: job.videoId,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.status === "failed" ? job.lastError : undefined,
      }))
    );
  } catch (error: any) {
    console.error("[RenderAPI] List jobs failed:", error);
    res.status(500).json({ error: "Failed to list render jobs" });
  }
});

renderRouter.post("/api/videos/:id/render", async (req: Request, res: Response) => {
  let cleanup: (() => void) | null = null;

  try {
    const parseResult = EditDecisionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid EDL payload",
        details: parseResult.error.flatten(),
      });
    }

    const edl = parseResult.data;
    console.log(`[RenderAPI] Starting render for video ${req.params.id}`, {
      fps: edl.fps,
      resolution: `${edl.width}x${edl.height}`,
      durationInFrames: edl.durationInFrames,
      videoSegments: edl.tracks.video.length,
      captions: edl.tracks.captions.length,
      transitions: edl.tracks.transitions.length,
      audioSegments: edl.tracks.audio.length,
    });

    const result = await RendererService.render(edl);
    cleanup = result.cleanup;

    if (req.destroyed) {
      cleanup();
      return;
    }

    const stat = fs.statSync(result.filePath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `attachment; filename="video-${req.params.id}.mp4"`);

    const stream = fs.createReadStream(result.filePath);

    req.on("close", () => {
      stream.destroy();
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    });

    stream.pipe(res);
    stream.on("end", () => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    });
    stream.on("error", (err) => {
      console.error("[RenderAPI] Stream error:", err);
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error during download" });
      }
    });
  } catch (error: any) {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    console.error("[RenderAPI] Render failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Render failed",
        message: error.message || "Unknown error",
      });
    }
  }
});

renderRouter.post("/api/videos/test-render", async (_req: Request, res: Response) => {
  let cleanup: (() => void) | null = null;

  try {
    const testEdl: EditDecision = {
      version: 1,
      fps: 30,
      width: 720,
      height: 1280,
      durationInFrames: 90,
      tracks: {
        video: [
          {
            id: "seg-1",
            assetId: "color-blue",
            startFrame: 0,
            endFrame: 45,
            trimStart: 0,
            volume: 1,
            cameraMotion: "slow-zoom-in",
            colorPreset: "none",
          },
          {
            id: "seg-2",
            assetId: "color-red",
            startFrame: 45,
            endFrame: 90,
            trimStart: 0,
            volume: 1,
            cameraMotion: "none",
            colorPreset: "warm",
          },
        ],
        captions: [
          {
            id: "cap-1",
            text: "Hello Navinta!",
            startFrame: 10,
            endFrame: 40,
            stylePackId: "default",
            animationType: "pop-in",
          },
          {
            id: "cap-2",
            text: "AI Video Production",
            startFrame: 50,
            endFrame: 85,
            stylePackId: "bold",
            animationType: "karaoke",
          },
        ],
        transitions: [
          {
            id: "tr-1",
            type: "crossfade",
            atFrame: 38,
            durationFrames: 15,
          },
        ],
        audio: [],
      },
      assetMap: {
        "color-blue": "https://placehold.co/720x1280/2563eb/2563eb.png",
        "color-red": "https://placehold.co/720x1280/ef4444/ef4444.png",
      },
    };

    console.log("[RenderAPI] Running test render...");

    const result = await RendererService.render(testEdl);
    cleanup = result.cleanup;

    if (_req.destroyed) {
      cleanup();
      return;
    }

    const stat = fs.statSync(result.filePath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", 'attachment; filename="test-render.mp4"');

    const stream = fs.createReadStream(result.filePath);

    _req.on("close", () => {
      stream.destroy();
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    });

    stream.pipe(res);
    stream.on("end", () => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    });
    stream.on("error", (err) => {
      console.error("[RenderAPI] Test stream error:", err);
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream error" });
      }
    });
  } catch (error: any) {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    console.error("[RenderAPI] Test render failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Test render failed",
        message: error.message || "Unknown error",
      });
    }
  }
});

renderRouter.post("/smart-edit", async (req: Request, res: Response) => {
  try {
    const { transcript, videoSrc } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({
        error: "transcript is required and must be an array of { text, start, end } objects",
      });
    }

    if (!videoSrc || typeof videoSrc !== "string") {
      return res.status(400).json({
        error: "videoSrc is required and must be a string URL",
      });
    }

    for (const word of transcript) {
      if (typeof word.text !== "string" || typeof word.start !== "number" || typeof word.end !== "number") {
        return res.status(400).json({
          error: "Each transcript entry must have text (string), start (number), and end (number)",
        });
      }
    }

    console.log(`[RenderAPI] Generating smart edit from ${transcript.length} words`);

    const edl: EDL = DecisionEngine.generateTimeline(transcript, videoSrc);

    const TRANSITION_OVERLAP = 4;
    const rawFrames = edl.clips.reduce((sum, clip) => sum + clip.durationInFrames, 0);
    const transitionCount = Math.max(0, edl.clips.length - 1);
    const totalFrames = rawFrames - transitionCount * TRANSITION_OVERLAP;

    res.json({
      edl,
      compositionId: "NavintaPremium",
      stats: {
        clipCount: edl.clips.length,
        totalFrames,
        totalDurationSec: parseFloat((totalFrames / edl.fps).toFixed(2)),
        transitionOverlapFrames: transitionCount * TRANSITION_OVERLAP,
        wordCount: transcript.length,
      },
    });
  } catch (error: any) {
    console.error("[RenderAPI] Smart edit generation failed:", error);
    res.status(500).json({
      error: "Smart edit generation failed",
      message: error.message || "Unknown error",
    });
  }
});
