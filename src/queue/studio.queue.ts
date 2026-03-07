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
  console.log("[studio-queue] Processing inline (always inline mode)");
  const { processStudioJobInline } = await import("../worker/studio.worker");
  processStudioJobInline(data);
  return data.messageId;
}
