import "dotenv/config";
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../queue/redis";
import type { AutoEditJobData } from "../queue/autoedit.queue";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { eq } from "drizzle-orm";
import { autoeditJobs } from "../../shared/schema";
import { getClipSignedUrl, getVideoSignedUrl } from "../../server/lib/supabaseStorage";

const QUEUE_NAME = "autoedit";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
const ML_SERVICE_TOKEN = process.env.ML_SERVICE_TOKEN || "";
const CONCURRENCY = parseInt(process.env.AUTOEDIT_CONCURRENCY || "2", 10);

function getDb() {
  neonConfig.webSocketConstructor = ws;
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("No database URL configured");
  const pool = new Pool({ connectionString: dbUrl });
  return drizzle(pool);
}

async function updateJobStatus(db: any, jobId: string, updates: Record<string, unknown>) {
  await db.update(autoeditJobs)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(autoeditJobs.id, jobId));
}

async function callMLService(signedUrl: string, jobId: string, options: Record<string, unknown> = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (ML_SERVICE_TOKEN) {
      headers["Authorization"] = `Bearer ${ML_SERVICE_TOKEN}`;
    }

    const res = await fetch(`${ML_SERVICE_URL}/autoedit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        video_url: signedUrl,
        job_id: jobId,
        fps: (options.fps as number) || 30,
        mode: (options.mode as string) || "talking_head",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "Unknown error");
      throw new Error(`ML service returned ${res.status}: ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function processJob(job: Job<AutoEditJobData>) {
  const { jobId, userId, inputVideoPath, storageBucket, options } = job.data;
  const db = getDb();

  console.log(`[worker] Processing job ${jobId} for user ${userId}`);

  const [existingJob] = await db.select().from(autoeditJobs)
    .where(eq(autoeditJobs.id, jobId))
    .limit(1);

  if (!existingJob) {
    console.log(`[worker] Job ${jobId} not found in DB, skipping`);
    return;
  }

  if (existingJob.status === "succeeded") {
    console.log(`[worker] Job ${jobId} already succeeded, skipping (idempotent)`);
    return;
  }

  if (existingJob.status === "canceled") {
    console.log(`[worker] Job ${jobId} was canceled, skipping`);
    return;
  }

  await updateJobStatus(db, jobId, { status: "processing", progress: 5 });

  let signedUrl: string;
  try {
    if (storageBucket === "clips") {
      signedUrl = await getClipSignedUrl(inputVideoPath, 600);
    } else {
      signedUrl = await getVideoSignedUrl(inputVideoPath, 600);
    }
  } catch (err: any) {
    await updateJobStatus(db, jobId, {
      status: "failed",
      error: "Failed to access input video file",
    });
    throw err;
  }

  await updateJobStatus(db, jobId, { progress: 10 });

  let edlResult: any;
  try {
    edlResult = await callMLService(signedUrl, jobId, options || {});
  } catch (err: any) {
    await updateJobStatus(db, jobId, {
      status: "failed",
      error: `ML analysis failed: ${err.message}`,
    });
    throw err;
  }

  await updateJobStatus(db, jobId, { progress: 70 });

  const metadata = {
    fps: edlResult.fps,
    clipCount: edlResult.clips?.length || 0,
    faceRatio: edlResult.meta?.faceRatio,
    avgMotion: edlResult.meta?.avgMotion,
    edl: edlResult,
  };

  await updateJobStatus(db, jobId, {
    status: "succeeded",
    progress: 100,
    outputMetadata: metadata,
  });

  console.log(`[worker] Job ${jobId} completed: ${metadata.clipCount} clips generated`);
}

export function startAutoEditWorker() {
  if (!process.env.REDIS_URL) {
    console.error("[worker] REDIS_URL not set. Cannot start worker.");
    process.exit(1);
  }

  console.log(`[worker] Starting autoedit worker (concurrency=${CONCURRENCY})`);

  const worker = new Worker<AutoEditJobData>(
    QUEUE_NAME,
    async (job) => processJob(job),
    {
      connection: getRedisConnection(),
      concurrency: CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.data.jobId} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.data.jobId} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[worker] Worker error:", err.message);
  });

  process.on("SIGTERM", async () => {
    console.log("[worker] Shutting down...");
    await worker.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[worker] Shutting down...");
    await worker.close();
    process.exit(0);
  });

  return worker;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startAutoEditWorker();
}
