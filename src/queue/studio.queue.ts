import { Queue } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "./redis";

const QUEUE_NAME = "studio-edit";

let _queue: Queue | null = null;

export interface StudioJobData {
  sessionId: string;
  messageId: string;
  userId: string;
  videoId: string;
  content: string;
}

export function getStudioQueue(): Queue<StudioJobData> {
  if (_queue) return _queue as Queue<StudioJobData>;

  if (!isRedisConfigured()) {
    throw new Error("Redis not configured. Cannot create studio-edit queue.");
  }

  _queue = new Queue<StudioJobData>(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { age: 7200, count: 500 },
      removeOnFail: { age: 86400 },
    },
  });

  return _queue as Queue<StudioJobData>;
}

export async function enqueueStudioJob(data: StudioJobData): Promise<string> {
  if (!isRedisConfigured()) {
    console.warn("[studio-queue] Redis not available, processing inline");
    const { processStudioJobInline } = await import("../worker/studio.worker");
    await processStudioJobInline(data);
    return data.messageId;
  }

  try {
    const queue = getStudioQueue();
    const job = await queue.add("edit", data, {
      jobId: `studio-${data.messageId}`,
    });

    return job.id || data.messageId;
  } catch (err: any) {
    console.warn(`[studio-queue] Queue enqueue failed, falling back inline: ${err.message}`);
    const { processStudioJobInline } = await import("../worker/studio.worker");
    await processStudioJobInline(data);
    return data.messageId;
  }
}
