import "dotenv/config";
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../queue/redis";
import type { ProEditJobData } from "../queue/proedit.queue";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { eq } from "drizzle-orm";
import { editRuns } from "../../shared/schema";
import { readFileSync } from "fs";
import { join } from "path";

const QUEUE_NAME = "pro-edit";
const CONCURRENCY = 1;

function getDb() {
  neonConfig.webSocketConstructor = ws;
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("No database URL configured");
  const pool = new Pool({ connectionString: dbUrl });
  return drizzle(pool);
}

async function updateRun(db: any, runId: string, updates: Record<string, unknown>) {
  await db
    .update(editRuns)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(editRuns.id, runId));
}

async function getStorageClient() {
  const { getSupabaseAdmin } = await import("../../server/lib/supabase");
  return getSupabaseAdmin();
}

async function getVideoSignedUrl(storagePath: string): Promise<string> {
  const supabase = await getStorageClient();
  if (!supabase) return storagePath;
  const bucket = storagePath.startsWith("clips/") ? "clips" : "videos";
  const { data } = await supabase.storage.from(bucket).createSignedUrl(
    storagePath.replace(/^(clips|videos)\//, ""),
    3600
  );
  return data?.signedUrl || storagePath;
}

interface ContextAnalysis {
  avgPauseMs: number;
  numLongPauses: number;
  recommendedCutAggressiveness: "gentle" | "moderate" | "aggressive";
  hookIntensity: "strong" | "moderate" | "weak";
  sentenceBoundaries: number[];
  totalWords: number;
  totalDurationMs: number;
  speechDensity: number;
}

async function step1ContextAnalysis(
  db: any,
  runId: string,
  words: Array<{ text: string; start: number; end: number; confidence?: number }>,
  videoUrl: string
): Promise<ContextAnalysis> {
  await updateRun(db, runId, {
    currentStep: 1,
    step1Status: "running",
    step1Progress: 10,
    status: "running",
  });

  const pauses: number[] = [];
  const sentenceBoundaries: number[] = [];
  const sentenceEnders = /[.!?]+$/;

  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > 0) pauses.push(gap);
  }

  await updateRun(db, runId, { step1Progress: 30 });

  for (let i = 0; i < words.length; i++) {
    if (sentenceEnders.test(words[i].text.trim())) {
      sentenceBoundaries.push(words[i].end);
    }
  }

  await updateRun(db, runId, { step1Progress: 50 });

  const avgPauseMs = pauses.length > 0
    ? Math.round(pauses.reduce((a, b) => a + b, 0) / pauses.length)
    : 0;
  const numLongPauses = pauses.filter((p) => p > 500).length;

  const totalDurationMs = words.length > 0
    ? words[words.length - 1].end - words[0].start
    : 0;
  const speechDensity = totalDurationMs > 0
    ? words.length / (totalDurationMs / 1000)
    : 0;

  await updateRun(db, runId, { step1Progress: 70 });

  let hookIntensity: "strong" | "moderate" | "weak" = "weak";
  const hookWords = words.filter((w) => w.start < 2000);
  if (hookWords.length >= 6) hookIntensity = "strong";
  else if (hookWords.length >= 3) hookIntensity = "moderate";

  let recommendedCutAggressiveness: "gentle" | "moderate" | "aggressive" = "moderate";
  if (numLongPauses > 10 || avgPauseMs > 600) recommendedCutAggressiveness = "aggressive";
  else if (numLongPauses < 3 && avgPauseMs < 300) recommendedCutAggressiveness = "gentle";

  await updateRun(db, runId, { step1Progress: 90 });

  const analysis: ContextAnalysis = {
    avgPauseMs,
    numLongPauses,
    recommendedCutAggressiveness,
    hookIntensity,
    sentenceBoundaries,
    totalWords: words.length,
    totalDurationMs,
    speechDensity: Math.round(speechDensity * 100) / 100,
  };

  const summary = `Analyzed ${words.length} words over ${Math.round(totalDurationMs / 1000)}s. ` +
    `Found ${numLongPauses} long pauses (avg ${avgPauseMs}ms). ` +
    `Hook: ${hookIntensity}. Cut style: ${recommendedCutAggressiveness}. ` +
    `Speech density: ${analysis.speechDensity} words/sec.`;

  await updateRun(db, runId, {
    step1Status: "succeeded",
    step1Progress: 100,
    step1Summary: summary,
  });

  console.log(`[pro-edit] Step 1 complete: ${summary}`);
  return analysis;
}

interface StoryboardSegment {
  startFrame: number;
  endFrame: number;
  intent: "hook" | "body" | "cta";
  zoomTarget: number;
  emphasis: boolean;
}

async function step2StoryboardCreation(
  db: any,
  runId: string,
  words: Array<{ text: string; start: number; end: number; confidence?: number }>,
  videoUrl: string,
  analysis: ContextAnalysis
): Promise<{ segments: StoryboardSegment[]; trimClips: any[] }> {
  await updateRun(db, runId, {
    currentStep: 2,
    step2Status: "running",
    step2Progress: 10,
  });

  const fps = 30;
  const { smartTrimSilence, smartClipsToEDLClips } = await import("../../server/lib/smartSilenceTrimmer");
  const { analyzeEmphasisMoments, emphasisToCameraMoves } = await import("../../server/lib/smartZoomAnalyzer");

  await updateRun(db, runId, { step2Progress: 20 });

  const [trimResult, emphasisMoments] = await Promise.all([
    smartTrimSilence(words, videoUrl),
    analyzeEmphasisMoments(words),
  ]);

  await updateRun(db, runId, { step2Progress: 50 });

  const edlClips = smartClipsToEDLClips(trimResult.clips, videoUrl);

  for (const clip of edlClips) {
    const clipMoves = emphasisToCameraMoves(
      emphasisMoments,
      clip.trimStartFrame * (1000 / fps),
      clip.durationInFrames * (1000 / fps)
    );
    clip.cameraMoves = clipMoves;
  }

  await updateRun(db, runId, { step2Progress: 70 });

  const segments: StoryboardSegment[] = [];
  let cumulativeFrame = 0;
  const totalDurationFrames = edlClips.reduce((sum: number, c: any) => sum + c.durationInFrames, 0);
  const hookEndFrame = Math.min(fps * 3, totalDurationFrames);
  const ctaStartFrame = Math.max(0, totalDurationFrames - fps * 5);

  for (const clip of edlClips) {
    const startFrame = cumulativeFrame;
    const endFrame = cumulativeFrame + clip.durationInFrames;

    let intent: "hook" | "body" | "cta" = "body";
    if (startFrame < hookEndFrame) intent = "hook";
    else if (endFrame > ctaStartFrame) intent = "cta";

    const hasEmphasis = (clip.cameraMoves?.length || 0) > 0;
    segments.push({
      startFrame,
      endFrame,
      intent,
      zoomTarget: clip.zoomTarget || 1.0,
      emphasis: hasEmphasis,
    });

    cumulativeFrame = endFrame;
  }

  await updateRun(db, runId, { step2Progress: 90 });

  const hookCount = segments.filter((s) => s.intent === "hook").length;
  const bodyCount = segments.filter((s) => s.intent === "body").length;
  const ctaCount = segments.filter((s) => s.intent === "cta").length;
  const emphasisCount = segments.filter((s) => s.emphasis).length;

  const summary = `Created storyboard with ${segments.length} segments ` +
    `(${hookCount} hook, ${bodyCount} body, ${ctaCount} CTA). ` +
    `${emphasisCount} emphasis moments marked. ` +
    `${trimResult.stats.removed} silences removed, ${trimResult.stats.shortened} shortened.`;

  await updateRun(db, runId, {
    step2Status: "succeeded",
    step2Progress: 100,
    step2Summary: summary,
  });

  console.log(`[pro-edit] Step 2 complete: ${summary}`);
  return { segments, trimClips: edlClips };
}

async function step3Animation(
  db: any,
  runId: string,
  words: Array<{ text: string; start: number; end: number; confidence?: number }>,
  edlClips: any[],
  analysis: ContextAnalysis,
  videoUrl: string
): Promise<any> {
  await updateRun(db, runId, {
    currentStep: 3,
    step3Status: "running",
    step3Progress: 10,
  });

  const { runAiEditDirector } = await import("../../server/lib/aiEditDirector");

  const totalDurationMs = edlClips.reduce((sum: number, c: any) => sum + (c.durationInFrames / 30) * 1000, 0);

  await updateRun(db, runId, { step3Progress: 25 });

  let directorResult;
  try {
    directorResult = await runAiEditDirector({
      words,
      existingCameraMoves: edlClips.flatMap((c: any) => c.cameraMoves || []),
      videoDurationMs: totalDurationMs,
      clipCount: edlClips.length,
      platform: "general",
    });
  } catch (dirError: any) {
    console.warn(`[pro-edit] AI Director failed, using defaults:`, dirError.message);
    directorResult = {
      captionStyleId: "tiktok-classic-pop",
      colorGrade: "cinematic",
      musicVolume: 0.15,
      transitions: edlClips.slice(0, -1).map(() => "fade" as const),
      additionalCameraMoves: [],
    };
  }

  await updateRun(db, runId, { step3Progress: 55 });

  for (let i = 0; i < edlClips.length - 1; i++) {
    if (directorResult.transitions[i]) {
      edlClips[i].transitionType = directorResult.transitions[i];
    }
  }

  if (directorResult.additionalCameraMoves.length > 0) {
    let offsetSec = 0;
    for (const move of directorResult.additionalCameraMoves) {
      let placed = false;
      let off = 0;
      for (const c of edlClips) {
        const clipDurSec = c.durationInFrames / 30;
        if (move.startSec >= off && move.startSec < off + clipDurSec) {
          c.cameraMoves = [...(c.cameraMoves || []), {
            ...move,
            startSec: move.startSec - off,
            endSec: Math.min(move.endSec - off, clipDurSec),
          }];
          placed = true;
          break;
        }
        off += clipDurSec;
      }
    }
  }

  await updateRun(db, runId, { step3Progress: 75 });

  const edl = {
    fps: 30,
    clips: edlClips,
    musicSrc: null,
    captionStyleId: directorResult.captionStyleId,
    colorGrade: directorResult.colorGrade,
    musicVolume: directorResult.musicVolume,
  };

  let captionStyleSpec: any = undefined;
  try {
    const stylesRaw = readFileSync(join(process.cwd(), "src/captions/styles/generated.json"), "utf-8");
    const allStyles = JSON.parse(stylesRaw);
    captionStyleSpec = allStyles.find((s: any) => s.id === edl.captionStyleId) || undefined;
  } catch {}

  await updateRun(db, runId, { step3Progress: 90 });

  const summary = `Applied ${directorResult.transitions.length} transitions, ` +
    `caption style: ${directorResult.captionStyleId}, ` +
    `color grade: ${directorResult.colorGrade}, ` +
    `music volume: ${directorResult.musicVolume}. ` +
    `${directorResult.additionalCameraMoves.length} extra camera moves added.`;

  await updateRun(db, runId, {
    step3Status: "succeeded",
    step3Progress: 100,
    step3Summary: summary,
    edlJson: edl,
  });

  console.log(`[pro-edit] Step 3 complete: ${summary}`);
  return { edl, captionStyleSpec };
}

async function step4Integration(
  db: any,
  runId: string,
  videoId: string,
  userId: string,
  edl: any,
  storagePath: string,
  captionStyleSpec?: any
): Promise<string | null> {
  await updateRun(db, runId, {
    currentStep: 4,
    step4Status: "running",
    step4Progress: 10,
  });

  const { renderViaCloudRun, isRenderServiceAvailable } = await import("../../server/lib/renderClient");

  if (!isRenderServiceAvailable()) {
    await updateRun(db, runId, { step4Progress: 20 });

    const { exportWithEdits } = await import("../../server/lib/ffmpegExport");
    const { join: pathJoin } = await import("path");
    const fs = await import("fs/promises");

    const tempDir = pathJoin(process.cwd(), "uploads", "temp");
    await fs.mkdir(tempDir, { recursive: true });

    const { downloadVideoToTemp, uploadVideoToStorage, isStorageAvailable } = await import("../../server/lib/supabaseStorage");

    let tempVideoFile: string | null = null;
    try {
      tempVideoFile = await downloadVideoToTemp(storagePath, tempDir);
      await updateRun(db, runId, { step4Progress: 40 });

      const outputFilename = await exportWithEdits({
        inputPath: tempVideoFile,
        cuts: [],
        captions: [],
        fps: edl.fps || 30,
      });

      await updateRun(db, runId, { step4Progress: 70 });

      const localOutputPath = pathJoin(process.cwd(), "uploads", "videos", outputFilename);
      let outputUrl: string | null = null;

      if (isStorageAvailable()) {
        const uploadResult = await uploadVideoToStorage(localOutputPath, userId);
        const supabase = await getStorageClient();
        if (supabase && uploadResult.path) {
          const { data } = await supabase.storage.from("renders").createSignedUrl(
            uploadResult.path.replace(/^renders\//, ""),
            3600 * 24
          );
          outputUrl = data?.signedUrl || null;
        }
        await fs.unlink(localOutputPath).catch(() => {});
      }

      await updateRun(db, runId, { step4Progress: 90 });
      return outputUrl;
    } finally {
      if (tempVideoFile) await fs.unlink(tempVideoFile).catch(() => {});
    }
  }

  await updateRun(db, runId, { step4Progress: 30 });

  const renderResult = await renderViaCloudRun({
    edl,
    composition: "TikTokStyle",
    userId,
    videoId,
    watermark: false,
    accentColor: "#FBBF24",
    captionFontSize: 72,
    captionStyleSpec,
  });

  await updateRun(db, runId, { step4Progress: 80 });

  let outputUrl = renderResult.signedUrl;

  if (renderResult.storagePath) {
    try {
      const { videos } = await import("../../shared/schema");
      await db.update(videos)
        .set({ videoPath: renderResult.storagePath, hasCaption: true, updatedAt: new Date() })
        .where(eq(videos.id, videoId));
    } catch (updateErr: any) {
      console.warn(`[pro-edit] Failed to update video record:`, updateErr.message);
    }
  }

  await updateRun(db, runId, { step4Progress: 95 });

  const summary = `Rendered ${renderResult.framesRendered || 0} frames in ${Math.round((renderResult.durationMs || 0) / 1000)}s. ` +
    `Output ready for download.`;

  return outputUrl;
}

async function processJob(job: Job<ProEditJobData>) {
  const { runId, videoId, userId } = job.data;
  const db = getDb();

  console.log(`[pro-edit] Starting pipeline for run ${runId}, video ${videoId}`);

  const [existing] = await db.select().from(editRuns).where(eq(editRuns.id, runId)).limit(1);
  if (!existing) {
    console.error(`[pro-edit] Run ${runId} not found`);
    return;
  }

  if (existing.status === "succeeded") {
    console.log(`[pro-edit] Run ${runId} already succeeded, skipping`);
    return;
  }

  await updateRun(db, runId, { status: "running" });

  let transcriptWords: Array<{ text: string; start: number; end: number; confidence?: number }> = [];
  let videoUrl = "";
  let storagePath = "";

  try {
    const { videos, transcriptions } = await import("../../shared/schema");
    const { and: andOp } = await import("drizzle-orm");

    const [video] = await db.select().from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) throw new Error("Video not found");
    storagePath = (video as any).videoPath || (video as any).video_path || "";
    if (!storagePath) throw new Error("Video has no storage path");
    videoUrl = await getVideoSignedUrl(storagePath);

    const [trans] = await db.select().from(transcriptions)
      .where(eq(transcriptions.videoId, videoId))
      .limit(1);

    if (trans && trans.captions && Array.isArray(trans.captions)) {
      transcriptWords = (trans.captions as any[]).map((w: any) => ({
        text: w.text || w.word || "",
        start: w.startMs ?? w.start ?? 0,
        end: w.endMs ?? w.end ?? 0,
        confidence: w.confidence,
      }));
    }

    if (transcriptWords.length === 0) {
      throw new Error("No transcript found. Please transcribe the video first.");
    }
  } catch (err: any) {
    await updateRun(db, runId, {
      status: "failed",
      step1Status: "failed",
      error: err.message,
    });
    throw err;
  }

  let analysis: ContextAnalysis;
  try {
    analysis = await step1ContextAnalysis(db, runId, transcriptWords, videoUrl);
  } catch (err: any) {
    await updateRun(db, runId, {
      status: "failed",
      step1Status: "failed",
      error: `Step 1 failed: ${err.message}`,
    });
    throw err;
  }

  let storyboard: { segments: StoryboardSegment[]; trimClips: any[] };
  try {
    storyboard = await step2StoryboardCreation(db, runId, transcriptWords, videoUrl, analysis);
  } catch (err: any) {
    await updateRun(db, runId, {
      status: "failed",
      step2Status: "failed",
      error: `Step 2 failed: ${err.message}`,
    });
    throw err;
  }

  let edlResult: { edl: any; captionStyleSpec?: any };
  try {
    edlResult = await step3Animation(db, runId, transcriptWords, storyboard.trimClips, analysis, videoUrl);
  } catch (err: any) {
    await updateRun(db, runId, {
      status: "failed",
      step3Status: "failed",
      error: `Step 3 failed: ${err.message}`,
    });
    throw err;
  }

  try {
    const fps = edlResult.edl.fps || 30;
    const totalDurationFrames = edlResult.edl.clips.reduce(
      (sum: number, c: any) => sum + (c.durationInFrames || 0),
      0
    );

    const brollWords: Array<{ text: string; startFrame: number; endFrame: number }> = [];
    for (const w of transcriptWords) {
      brollWords.push({
        text: w.text,
        startFrame: Math.round((w.start / 1000) * fps),
        endFrame: Math.round((w.end / 1000) * fps),
      });
    }

    const { planBrollInserts } = await import("../../server/lib/brollPlanner");
    const inserts = planBrollInserts({
      words: brollWords,
      fps,
      totalDurationFrames,
      maxInserts: 2,
      aspectRatio: "9:16",
    });

    if (inserts.length > 0) {
      console.log(`[pro-edit] B-roll planner found ${inserts.length} insert points`);

      const { lumaGenerations } = await import("../../shared/schema");
      const { computeCacheKey } = await import("../../server/lib/lumaService");
      const { enqueueLumaJob } = await import("../queue/luma.queue");

      const cachedInsertIds: string[] = [];
      const queuedInsertIds: string[] = [];

      for (const insert of inserts) {
        const durationSeconds = Math.round(insert.durationInFrames / fps);
        const cacheKey = computeCacheKey(insert.prompt, insert.aspectRatio, durationSeconds, "");

        const [existingByCache] = await db
          .select()
          .from(lumaGenerations)
          .where(eq(lumaGenerations.cacheKey, cacheKey))
          .limit(1);

        if (existingByCache && existingByCache.status === "succeeded" && existingByCache.assetUrl) {
          edlResult.edl.lumaBroll = edlResult.edl.lumaBroll || [];
          edlResult.edl.lumaBroll.push({
            id: insert.insertId,
            src: existingByCache.assetUrl,
            startFrame: insert.startFrame,
            durationInFrames: insert.durationInFrames,
            type: "luma" as const,
            prompt: insert.prompt,
            mix: 1,
            audio: { lumaAudioGain: 0 },
          });
          cachedInsertIds.push(insert.insertId);
          console.log(`[pro-edit] B-roll cache hit for insert ${insert.insertId} (reusing asset from ${existingByCache.insertId})`);
          continue;
        }

        await db.insert(lumaGenerations).values({
          userId,
          videoId,
          insertId: insert.insertId,
          prompt: insert.prompt,
          generationType: "text_to_video",
          aspectRatio: insert.aspectRatio,
          durationSeconds,
          startFrame: insert.startFrame,
          durationInFrames: insert.durationInFrames,
          status: "queued",
          cacheKey,
        });

        try {
          await enqueueLumaJob({
            videoId,
            insertId: insert.insertId,
            userId,
            prompt: insert.prompt,
            aspectRatio: insert.aspectRatio,
            durationSeconds,
            cacheKey,
            generationType: "text_to_video",
          });
          queuedInsertIds.push(insert.insertId);
          console.log(`[pro-edit] Enqueued Luma B-roll job for insert ${insert.insertId}`);
        } catch (queueErr: any) {
          console.warn(`[pro-edit] Failed to enqueue B-roll job: ${queueErr.message}`);
          await db
            .update(lumaGenerations)
            .set({ status: "failed", error: `Queue error: ${queueErr.message}`, updatedAt: new Date() })
            .where(eq(lumaGenerations.insertId, insert.insertId));
        }
      }

      const MAX_BROLL_WAIT_MS = 5 * 60 * 1000;
      const POLL_INTERVAL_MS = 5000;
      const pendingInsertIds = queuedInsertIds;

      if (pendingInsertIds.length > 0) {
        console.log(`[pro-edit] Waiting for ${pendingInsertIds.length} B-roll generations (max ${MAX_BROLL_WAIT_MS / 1000}s)...`);
        const waitStart = Date.now();

        while (Date.now() - waitStart < MAX_BROLL_WAIT_MS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

          const rows = await db
            .select()
            .from(lumaGenerations)
            .where(eq(lumaGenerations.videoId, videoId));

          const pending = rows.filter(
            (r: any) => pendingInsertIds.includes(r.insertId) && (r.status === "queued" || r.status === "processing")
          );

          if (pending.length === 0) break;
        }

        const finalRows = await db
          .select()
          .from(lumaGenerations)
          .where(eq(lumaGenerations.videoId, videoId));

        edlResult.edl.lumaBroll = edlResult.edl.lumaBroll || [];
        for (const row of finalRows) {
          if (
            pendingInsertIds.includes(row.insertId) &&
            row.status === "succeeded" &&
            row.assetUrl
          ) {
            const matchingInsert = inserts.find((i) => i.insertId === row.insertId);
            edlResult.edl.lumaBroll.push({
              id: row.insertId,
              src: row.assetUrl,
              startFrame: matchingInsert?.startFrame ?? row.startFrame ?? 0,
              durationInFrames: matchingInsert?.durationInFrames ?? row.durationInFrames ?? 120,
              type: "luma" as const,
              prompt: row.prompt,
              mix: 1,
              audio: { lumaAudioGain: 0 },
            });
          }
        }

        console.log(`[pro-edit] ${edlResult.edl.lumaBroll.length} B-roll inserts ready for render`);
      }
    } else {
      console.log("[pro-edit] No suitable B-roll insert points found");
    }
  } catch (brollErr: any) {
    console.warn(`[pro-edit] B-roll generation failed (non-fatal): ${brollErr.message}`);
  }

  let outputUrl: string | null = null;
  try {
    outputUrl = await step4Integration(db, runId, videoId, userId, edlResult.edl, storagePath, edlResult.captionStyleSpec);
  } catch (err: any) {
    await updateRun(db, runId, {
      status: "failed",
      step4Status: "failed",
      error: `Step 4 failed: ${err.message}`,
    });
    throw err;
  }

  await updateRun(db, runId, {
    status: "succeeded",
    step4Status: "succeeded",
    step4Progress: 100,
    step4Summary: "Final video rendered and ready for download.",
    outputUrl,
  });

  console.log(`[pro-edit] Pipeline complete for run ${runId}`);
}

export async function processProEditJobInline(data: ProEditJobData): Promise<void> {
  console.warn("[pro-edit] Processing inline (no Redis queue)");
  const fakeJob = { data } as Job<ProEditJobData>;
  processJob(fakeJob).catch((err) => {
    console.error(`[pro-edit] Inline job failed:`, err.message);
  });
}

export function startProEditWorker() {
  if (!process.env.REDIS_URL) {
    console.error("[pro-edit-worker] REDIS_URL not set. Cannot start worker.");
    return;
  }

  console.log(`[pro-edit-worker] Starting pro-edit worker (concurrency=${CONCURRENCY})`);

  const worker = new Worker<ProEditJobData>(
    QUEUE_NAME,
    async (job) => processJob(job),
    {
      connection: getRedisConnection(),
      concurrency: CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[pro-edit-worker] Job for run ${job.data.runId} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[pro-edit-worker] Job for run ${job?.data.runId} failed:`, err.message);
  });

  let lastWorkerErr = 0;
  worker.on("error", (err) => {
    const now = Date.now();
    if (now - lastWorkerErr > 30000) {
      console.warn("[pro-edit-worker] Worker error:", err.message);
      lastWorkerErr = now;
    }
  });

  return worker;
}
