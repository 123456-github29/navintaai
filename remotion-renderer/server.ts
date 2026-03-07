import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = parseInt(process.env.PORT || "8080", 10);
const AUTH_TOKEN = process.env.ML_SERVICE_TOKEN || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let bundleLocation: string | null = null;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function getBundleLocation(): Promise<string> {
  if (bundleLocation) return bundleLocation;

  const entryPoint = path.resolve(__dirname, "src/remotion/Root.tsx");
  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Remotion entry point not found: ${entryPoint}`);
  }

  console.log("[renderer] Bundling Remotion compositions...");
  const start = Date.now();

  bundleLocation = await bundle({
    entryPoint,
    onProgress: (progress: number) => {
      if (progress % 25 === 0) {
        console.log(`[renderer] Bundle progress: ${progress}%`);
      }
    },
  });

  console.log(`[renderer] Bundle complete in ${Date.now() - start}ms`);
  return bundleLocation;
}

function findChromium(): string {
  const paths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Chromium not found");
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!AUTH_TOKEN) return next();
  const header = req.headers.authorization;
  if (!header || header !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "remotion-renderer" });
});

app.post("/render", authMiddleware, async (req, res) => {
  const startTime = Date.now();
  const {
    edl,
    composition = "TikTokStyle",
    userId,
    videoId,
    watermark = false,
    accentColor = "#FBBF24",
    captionFontSize = 72,
    captionStyleSpec,
  } = req.body;

  if (!edl || !edl.clips || edl.clips.length === 0) {
    return res.status(400).json({ error: "EDL with clips is required" });
  }

  if (!edl.fps || edl.fps <= 0) edl.fps = 30;

  console.log(`[render] Starting ${composition} render: ${edl.clips.length} clips, ${edl.fps}fps`);

  const outputDir = path.join(os.tmpdir(), `render-${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "output.mp4");

  try {
    const bundleLoc = await getBundleLocation();
    const chromiumPath = findChromium();

    const TRANSITION_OVERLAP = composition === "TikTokStyle" ? 6 : 4;
    const totalFrames = edl.clips.reduce((sum: number, clip: any) => sum + clip.durationInFrames, 0);
    const transitionCount = Math.max(0, edl.clips.length - 1);
    const durationInFrames = Math.max(1, totalFrames - transitionCount * TRANSITION_OVERLAP);

    const inputProps: any = composition === "TikTokStyle"
      ? { edl, watermark, accentColor, captionFontSize, captionStyleSpec }
      : { edl };

    console.log(`[render] Selecting composition ${composition}...`);
    const comp = await selectComposition({
      serveUrl: bundleLoc,
      id: composition,
      inputProps,
      browserExecutable: chromiumPath,
    });

    const compWithOverrides = {
      ...comp,
      width: 1080,
      height: 1920,
      fps: edl.fps,
      durationInFrames,
    };

    console.log(`[render] Rendering ${durationInFrames} frames at ${edl.fps}fps...`);

    await renderMedia({
      composition: compWithOverrides,
      serveUrl: bundleLoc,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      browserExecutable: chromiumPath,
      concurrency: 2,
      pixelFormat: "yuv420p",
      crf: 18,
      audioBitrate: "192k",
      x264Preset: "medium",
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) {
          console.log(`[render] Progress: ${pct}%`);
        }
      },
    });

    console.log(`[render] Render complete in ${Date.now() - startTime}ms`);

    let storagePath: string | null = null;
    let signedUrl: string | null = null;

    const supabase = getSupabase();
    if (supabase && userId) {
      const filename = `${userId}/${videoId || `render-${Date.now()}`}.mp4`;
      const fileBuffer = fs.readFileSync(outputPath);

      const { error: uploadError } = await supabase.storage
        .from("renders")
        .upload(filename, fileBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (uploadError) {
        console.error("[render] Upload error:", uploadError.message);
      } else {
        storagePath = filename;
        const { data: urlData } = await supabase.storage
          .from("renders")
          .createSignedUrl(filename, 86400);
        signedUrl = urlData?.signedUrl || null;
        console.log(`[render] Uploaded to Supabase: ${filename}`);
      }
    }

    res.json({
      success: true,
      storagePath,
      signedUrl,
      durationMs: Date.now() - startTime,
      framesRendered: durationInFrames,
    });
  } catch (error: any) {
    console.error("[render] Error:", error.message);
    console.error("[render] Stack:", error.stack);
    res.status(500).json({ error: error.message });
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[renderer] Listening on port ${PORT}`);
  getBundleLocation().catch((err) => {
    console.warn("[renderer] Pre-bundle failed (will retry on first request):", err.message);
  });
});
