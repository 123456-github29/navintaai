import "dotenv/config";
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../queue/redis";
import type { LumaJobData } from "../queue/luma.queue";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { eq } from "drizzle-orm";
import { lumaGenerations } from "../../shared/schema";
import {
  createGeneration,
  createImageToVideo,
  extendGeneration,
  pollGeneration,
  downloadAndStore,
  computeCacheKey,
} from "../../server/lib/lumaService";
import type { LumaCameraMove } from "../../server/lib/lumaService";

const QUEUE_NAME = "luma-broll";
const CONCURRENCY = parseInt(process.env.LUMA_CONCURRENCY || "1", 10);

function getDb() {
  neonConfig.webSocketConstructor = ws;
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("No database URL configured");
  const pool = new Pool({ connectionString: dbUrl });
  return drizzle(pool);
}

async function updateGenerationStatus(
  db: any,
  insertId: string,
  updates: Record<string, unknown>
) {
  await db
    .update(lumaGenerations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(lumaGenerations.insertId, insertId));
}

async function processJob(job: Job<LumaJobData>) {
  const { videoId, insertId, userId, prompt, aspectRatio, durationSeconds, cacheKey } = job.data;
  const db = getDb();

  console.log(`[luma-worker] Processing insert ${insertId} for video ${videoId}`);

  const [existing] = await db
    .select()
    .from(lumaGenerations)
    .where(eq(lumaGenerations.insertId, insertId))
    .limit(1);

  if (!existing) {
    console.log(`[luma-worker] Insert ${insertId} not found in DB, skipping`);
    return;
  }

  if (existing.status === "succeeded") {
    console.log(`[luma-worker] Insert ${insertId} already succeeded, skipping`);
    return;
  }

  const [cached] = await db
    .select()
    .from(lumaGenerations)
    .where(eq(lumaGenerations.cacheKey, cacheKey))
    .limit(1);

  if (cached && cached.status === "succeeded" && cached.assetUrl && cached.insertId !== insertId) {
    console.log(`[luma-worker] Cache hit for insert ${insertId}, reusing asset from ${cached.insertId}`);
    await updateGenerationStatus(db, insertId, {
      status: "succeeded",
      assetStoragePath: cached.assetStoragePath,
      assetUrl: cached.assetUrl,
      lumaJobId: cached.lumaJobId,
    });
    return;
  }

  await updateGenerationStatus(db, insertId, { status: "processing" });

  const genType = job.data.generationType || "text_to_video";
  const cameraMove = job.data.cameraMove as LumaCameraMove | undefined;
  const loop = job.data.loop || false;

  let lumaResponse;
  try {
    if (genType === "image_to_video" && job.data.sourceImageUrl) {
      lumaResponse = await createImageToVideo(
        prompt,
        job.data.sourceImageUrl,
        aspectRatio,
        durationSeconds,
        { cameraMove, loop }
      );
    } else if (genType === "extend" && job.data.sourceGenerationId) {
      lumaResponse = await extendGeneration(
        prompt,
        job.data.sourceGenerationId,
        { cameraMove, loop, durationSeconds, aspectRatio }
      );
    } else {
      lumaResponse = await createGeneration(prompt, aspectRatio, durationSeconds, {
        cameraMove,
        loop,
      });
    }
  } catch (err: any) {
    await updateGenerationStatus(db, insertId, {
      status: "failed",
      error: `Luma generation request failed: ${err.message}`,
    });
    throw err;
  }

  await updateGenerationStatus(db, insertId, { lumaJobId: lumaResponse.id });

  let completedGeneration;
  try {
    completedGeneration = await pollGeneration(lumaResponse.id);
  } catch (err: any) {
    await updateGenerationStatus(db, insertId, {
      status: "failed",
      error: `Luma polling failed: ${err.message}`,
    });
    throw err;
  }

  const assetUrl = completedGeneration.assets?.video;
  if (!assetUrl) {
    await updateGenerationStatus(db, insertId, {
      status: "failed",
      error: "Luma generation completed but no video asset returned",
    });
    throw new Error("No video asset in completed Luma generation");
  }

  const storagePath = `${userId}/${videoId}/${insertId}.mp4`;
  let stored;
  try {
    stored = await downloadAndStore(assetUrl, storagePath);
  } catch (err: any) {
    await updateGenerationStatus(db, insertId, {
      status: "failed",
      error: `Asset download/upload failed: ${err.message}`,
    });
    throw err;
  }

  await updateGenerationStatus(db, insertId, {
    status: "succeeded",
    assetStoragePath: stored.path,
    assetUrl: stored.url,
  });

  console.log(`[luma-worker] Insert ${insertId} completed successfully`);
}

export async function processLumaJobInline(data: LumaJobData): Promise<void> {
  console.warn("[luma-worker] Processing inline (no Redis queue)");
  const fakeJob = { data } as Job<LumaJobData>;
  await processJob(fakeJob);
}

export function startLumaWorker() {
  if (!process.env.REDIS_URL) {
    console.error("[luma-worker] REDIS_URL not set. Cannot start worker.");
    process.exit(1);
  }

  console.log(`[luma-worker] Starting luma-broll worker (concurrency=${CONCURRENCY})`);

  const worker = new Worker<LumaJobData>(
    QUEUE_NAME,
    async (job) => processJob(job),
    {
      connection: getRedisConnection(),
      concurrency: CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[luma-worker] Job for insert ${job.data.insertId} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[luma-worker] Job for insert ${job?.data.insertId} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[luma-worker] Worker error:", err.message);
  });

  process.on("SIGTERM", async () => {
    console.log("[luma-worker] Shutting down...");
    await worker.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[luma-worker] Shutting down...");
    await worker.close();
    process.exit(0);
  });

  return worker;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startLumaWorker();
}
