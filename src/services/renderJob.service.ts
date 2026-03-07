import fs from "fs";
import { storage } from "../../server/storage";
import { RendererService } from "./renderer.service";
import { uploadRenderToStorage } from "../../server/lib/supabaseStorage";
import type { EditDecision } from "../schemas/editDecision.schema";
import type { RenderJob } from "../../shared/schema";

let isWorkerRunning = false;
const POLL_INTERVAL_MS = 5000;
const MAX_CONCURRENT_RENDERS = 1;
let activeRenders = 0;

export class RenderJobService {
  static async enqueue(
    userId: string,
    videoId: string,
    edl: EditDecision,
    watermark: boolean = true
  ): Promise<RenderJob> {
    const video = await storage.getVideo(videoId, userId);
    if (!video) {
      throw new Error("Video not found or not owned by user");
    }

    const job = await storage.createRenderJob({
      userId,
      videoId,
      edlJson: edl as any,
      watermark,
      status: "queued",
      progress: 0,
    });

    if (!isWorkerRunning) {
      RenderJobService.startWorker();
    }

    return job;
  }

  static async getJob(jobId: string, userId: string): Promise<RenderJob | undefined> {
    return storage.getRenderJob(jobId, userId);
  }

  static async getJobsForUser(userId: string): Promise<RenderJob[]> {
    return storage.getRenderJobsByUser(userId);
  }

  static startWorker(): void {
    if (isWorkerRunning) return;
    isWorkerRunning = true;
    console.log("[RenderWorker] Started polling for queued jobs");
    pollLoop();
  }

  static stopWorker(): void {
    isWorkerRunning = false;
    console.log("[RenderWorker] Stopped");
  }
}

async function pollLoop(): Promise<void> {
  while (isWorkerRunning) {
    try {
      if (activeRenders < MAX_CONCURRENT_RENDERS) {
        const jobs = await storage.getQueuedRenderJobs();
        if (jobs.length > 0) {
          const job = jobs[0];
          processJob(job).catch((err) => {
            console.error(`[RenderWorker] Unhandled error processing job ${job.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.error("[RenderWorker] Poll error:", err);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

async function processJob(job: RenderJob): Promise<void> {
  activeRenders++;
  const startTime = Date.now();

  try {
    await storage.updateRenderJob(job.id, {
      status: "rendering",
      progress: 5,
    });

    console.log(`[RenderWorker] Processing job ${job.id} for video ${job.videoId}`);

    if (!job.videoId) {
      throw new Error("Job has no videoId");
    }

    const edl = job.edlJson as unknown as EditDecision;

    const edlWithWatermark = {
      ...edl,
      watermark: job.watermark ?? true,
    };

    const { filePath, cleanup } = await RendererService.render(edlWithWatermark);

    try {
      await storage.updateRenderJob(job.id, { progress: 80 });

      const uploadResult = await uploadRenderToStorage(filePath, job.userId, job.videoId);

      await storage.updateRenderJob(job.id, {
        status: "completed",
        progress: 100,
        outputPath: uploadResult.path,
        completedAt: new Date(),
      });

      const elapsedMs = Date.now() - startTime;
      console.log(`[RenderWorker] Job ${job.id} completed in ${Math.round(elapsedMs / 1000)}s`);
    } finally {
      cleanup();
    }
  } catch (err: any) {
    console.error(`[RenderWorker] Job ${job.id} failed:`, err);
    await storage.updateRenderJob(job.id, {
      status: "failed",
      lastError: err.message || "Unknown render error",
      completedAt: new Date(),
    });
  } finally {
    activeRenders--;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
