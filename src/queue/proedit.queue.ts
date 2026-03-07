import { Queue } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "./redis";

const QUEUE_NAME = "pro-edit";

let _queue: Queue | null = null;

export interface ProEditJobData {
  runId: string;
  videoId: string;
  userId: string;
}

export function getProEditQueue(): Queue<ProEditJobData> {
  if (_queue) return _queue as Queue<ProEditJobData>;

  if (!isRedisConfigured()) {
    throw new Error("Redis not configured. Cannot create pro-edit queue.");
  }

  _queue = new Queue<ProEditJobData>(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { age: 7200, count: 500 },
      removeOnFail: { age: 86400 },
    },
  });

  return _queue as Queue<ProEditJobData>;
}

export async function enqueueProEditJob(data: ProEditJobData): Promise<string> {
  if (!isRedisConfigured()) {
    console.warn("[pro-edit-queue] Redis not available, processing inline");
    const { processProEditJobInline } = await import("../worker/proedit.worker");
    processProEditJobInline(data);
    return data.runId;
  }

  const queue = getProEditQueue();
  const job = await queue.add("process", data, {
    jobId: `proedit-${data.runId}`,
  });

  console.log(`[pro-edit-queue] Enqueued job for run ${data.runId}`);
  return job.id || data.runId;
}
