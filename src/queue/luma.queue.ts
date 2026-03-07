import { Queue } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "./redis";

const QUEUE_NAME = "luma-broll";

let _queue: Queue | null = null;

export interface LumaJobData {
  videoId: string;
  insertId: string;
  userId: string;
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
  cacheKey: string;
  generationType?: "text_to_video" | "image_to_video" | "extend";
  cameraMove?: string;
  sourceImageUrl?: string;
  sourceGenerationId?: string;
  loop?: boolean;
}

export function getLumaQueue(): Queue<LumaJobData> {
  if (_queue) return _queue as Queue<LumaJobData>;

  if (!isRedisConfigured()) {
    throw new Error("Redis not configured. Cannot create luma-broll queue.");
  }

  _queue = new Queue<LumaJobData>(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
      },
    },
  });

  return _queue as Queue<LumaJobData>;
}

export async function enqueueLumaJob(data: LumaJobData): Promise<string> {
  if (!isRedisConfigured()) {
    console.warn("[luma-queue] Redis not available, processing inline");
    const { processLumaJobInline } = await import("../worker/luma.worker");
    await processLumaJobInline(data);
    return data.insertId;
  }

  const queue = getLumaQueue();

  const job = await queue.add("generate", data, {
    jobId: `luma-${data.insertId}`,
  });

  console.log(`[luma-queue] Enqueued luma job for insert ${data.insertId}`);
  return job.id || data.insertId;
}

export async function removeLumaJob(insertId: string): Promise<boolean> {
  const queue = getLumaQueue();
  try {
    const job = await queue.getJob(`luma-${insertId}`);
    if (job) {
      const state = await job.getState();
      if (state === "waiting" || state === "delayed") {
        await job.remove();
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
