import { Queue } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "./redis";

const QUEUE_NAME = "autoedit";

let _queue: Queue | null = null;

export interface AutoEditJobData {
  jobId: string;
  userId: string;
  inputVideoPath: string;
  storageBucket: string;
  options?: {
    aspectRatio?: string;
    captionStyle?: string;
    intensity?: string;
    fps?: number;
    mode?: string;
  };
}

export function getAutoEditQueue(): Queue<AutoEditJobData> {
  if (_queue) return _queue as Queue<AutoEditJobData>;

  if (!isRedisConfigured()) {
    throw new Error("Redis not configured. Cannot create autoedit queue.");
  }

  _queue = new Queue<AutoEditJobData>(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
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

  return _queue as Queue<AutoEditJobData>;
}

export async function enqueueAutoEditJob(data: AutoEditJobData): Promise<string> {
  const queue = getAutoEditQueue();

  const job = await queue.add("process", data, {
    jobId: data.jobId,
  });

  console.log(`[queue] Enqueued autoedit job ${data.jobId}`);
  return job.id || data.jobId;
}

export async function removeAutoEditJob(jobId: string): Promise<boolean> {
  const queue = getAutoEditQueue();
  try {
    const job = await queue.getJob(jobId);
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
