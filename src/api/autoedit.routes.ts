import type { Express } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { autoeditJobs } from "../../shared/schema";
import { requireAuth } from "../../server/middleware/authJwt";
import { asyncHandler, createError } from "../../server/middleware/errorHandler";
import { isRedisConfigured } from "../queue/redis";
import { enqueueAutoEditJob, removeAutoEditJob } from "../queue/autoedit.queue";
import { getRenderSignedUrl } from "../../server/lib/supabaseStorage";
import { storage } from "../../server/storage";

const CreateJobSchema = z.object({
  inputVideoPath: z.string().min(1),
  inputBucket: z.string().optional().default("clips"),
  options: z.object({
    aspectRatio: z.string().optional(),
    captionStyle: z.string().optional(),
    intensity: z.string().optional(),
    fps: z.number().optional().default(30),
    mode: z.string().optional().default("talking_head"),
  }).optional().default({}),
});

export function registerAutoEditRoutes(app: Express) {
  const db = (storage as any).getDb();

  app.post("/api/autoedit/jobs", requireAuth as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;

    if (!isRedisConfigured()) {
      throw createError("Auto-edit queue service is not available", 503, "QUEUE_UNAVAILABLE");
    }

    const parsed = CreateJobSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError("Invalid request body", 400, "VALIDATION_ERROR");
    }

    const { inputVideoPath, inputBucket, options } = parsed.data;

    const [job] = await db.insert(autoeditJobs).values({
      userId,
      status: "queued",
      progress: 0,
      inputVideoPath,
      inputBucket,
      options,
    }).returning();

    await enqueueAutoEditJob({
      jobId: job.id,
      userId,
      inputVideoPath,
      storageBucket: inputBucket,
      options,
    });

    console.log(`[autoedit] Job ${job.id} created and enqueued for user ${userId}`);

    res.status(202).json({ jobId: job.id });
  }));

  app.get("/api/autoedit/jobs/:id", requireAuth as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { id } = req.params;

    const [job] = await db.select().from(autoeditJobs)
      .where(and(eq(autoeditJobs.id, id), eq(autoeditJobs.userId, userId)))
      .limit(1);

    if (!job) {
      throw createError("Job not found", 404, "JOB_NOT_FOUND");
    }

    const response: Record<string, unknown> = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    if (job.status === "succeeded" && job.outputVideoPath) {
      try {
        const signedUrl = await getRenderSignedUrl(job.outputVideoPath, 600);
        response.outputSignedUrl = signedUrl;
      } catch {
        response.outputSignedUrl = null;
      }
    }

    if (job.outputMetadata && Object.keys(job.outputMetadata as any).length > 0) {
      response.metadata = job.outputMetadata;
    }

    res.json(response);
  }));

  app.post("/api/autoedit/jobs/:id/cancel", requireAuth as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { id } = req.params;

    const [job] = await db.select().from(autoeditJobs)
      .where(and(eq(autoeditJobs.id, id), eq(autoeditJobs.userId, userId)))
      .limit(1);

    if (!job) {
      throw createError("Job not found", 404, "JOB_NOT_FOUND");
    }

    if (job.status === "succeeded" || job.status === "failed") {
      throw createError("Cannot cancel a completed job", 400, "JOB_ALREADY_COMPLETE");
    }

    await removeAutoEditJob(id);

    await db.update(autoeditJobs)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(autoeditJobs.id, id));

    console.log(`[autoedit] Job ${id} canceled by user ${userId}`);

    res.json({ id, status: "canceled" });
  }));
}
