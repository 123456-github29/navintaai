import "dotenv/config";
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../queue/redis";
import type { StudioJobData } from "../queue/studio.queue";
import { eq, desc, asc } from "drizzle-orm";
import {
  editSessions,
  edlVersions,
  editMessages,
  editRuns,
  videos,
  transcriptions,
  lumaGenerations,
  userEntitlements,
} from "../../shared/schema";
import type { EDL } from "../../src/remotion/types/edl";

const QUEUE_NAME = "studio-edit";
const CONCURRENCY = 1;

let _sharedDb: any = null;

function getDb() {
  if (_sharedDb) return _sharedDb;

  try {
    const { storage } = require("../../server/storage");
    if (storage && typeof storage.getDb === "function") {
      _sharedDb = storage.getDb();
      return _sharedDb;
    }
  } catch {}

  const { drizzle } = require("drizzle-orm/postgres-js");
  const postgres = require("postgres");
  const connectionString =
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("No database URL configured");
  const client = postgres(connectionString, {
    max: 5,
    idle_timeout: 30,
    connect_timeout: 30,
    prepare: false,
    ssl: "require",
  });
  _sharedDb = drizzle(client);
  return _sharedDb;
}

export function setSharedDb(db: any) {
  _sharedDb = db;
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

function buildEdlSummary(edl: EDL) {
  const totalDurationSec = edl.clips.reduce(
    (sum, c) => sum + c.durationInFrames / edl.fps,
    0
  );
  return {
    clipCount: edl.clips.length,
    totalDurationSec: Math.round(totalDurationSec * 10) / 10,
    captionStyleId: edl.captionStyleId,
    colorGrade: edl.colorGrade,
    brollCount: edl.lumaBroll?.length || 0,
    transitionTypes: Array.from(
      new Set(
        edl.clips.map((c) => c.transitionType).filter(Boolean) as string[]
      )
    ),
    hasZooms: edl.clips.some((c) => (c.zoomTarget || 1) > 1.01),
  };
}

async function processJob(job: Job<StudioJobData>) {
  const { sessionId, messageId, userId, videoId, content } = job.data;
  const db = getDb();

  console.log(
    `[studio] Processing message ${messageId} for session ${sessionId}`
  );

  const [session] = await db
    .select()
    .from(editSessions)
    .where(eq(editSessions.id, sessionId))
    .limit(1);

  if (!session) {
    console.error(`[studio] Session ${sessionId} not found`);
    return;
  }

  await db
    .update(editSessions)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(editSessions.id, sessionId));

  let editRunId: string | null = null;
  try {
    const [run] = await db
      .insert(editRuns)
      .values({
        userId,
        videoId,
        status: "planning",
        currentStep: 1,
        step1Status: "running",
        step1Summary: "Analyzing intent...",
      })
      .returning();
    editRunId = run.id;
  } catch (runErr: any) {
    console.warn(`[studio] Failed to create edit_run: ${runErr.message}`);
  }

  try {
    let currentEdl: EDL;
    let currentVersionNumber = 0;

    if (session.activeVersionId) {
      const [activeVersion] = await db
        .select()
        .from(edlVersions)
        .where(eq(edlVersions.id, session.activeVersionId))
        .limit(1);

      if (activeVersion) {
        currentEdl = activeVersion.edlJson as EDL;
        currentVersionNumber = activeVersion.versionNumber;
      } else {
        throw new Error("Active EDL version not found");
      }
    } else {
      throw new Error("No active EDL version on session");
    }

    let transcriptWords: Array<{
      text: string;
      start: number;
      end: number;
    }> = [];

    try {
      const [trans] = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.videoId, videoId))
        .limit(1);

      if (trans && trans.captions && Array.isArray(trans.captions)) {
        const extracted: Array<{ text: string; start: number; end: number }> = [];

        for (const segment of trans.captions as any[]) {
          if (Array.isArray(segment?.words) && segment.words.length > 0) {
            for (const w of segment.words) {
              const text = (w.word || w.text || "").trim();
              const start = Number(w.startMs ?? w.start ?? segment.startMs ?? segment.start ?? 0);
              const end = Number(w.endMs ?? w.end ?? segment.endMs ?? segment.end ?? start);
              if (text && Number.isFinite(start) && Number.isFinite(end) && end > start) {
                extracted.push({ text, start, end });
              }
            }
            continue;
          }

          const text = (segment?.text || segment?.originalText || segment?.viralText || segment?.word || "").trim();
          const start = Number(segment?.startMs ?? segment?.start ?? 0);
          const end = Number(segment?.endMs ?? segment?.end ?? start);
          if (text && Number.isFinite(start) && Number.isFinite(end) && end > start) {
            extracted.push({ text, start, end });
          }
        }

        transcriptWords = extracted.sort((a, b) => a.start - b.start);
      }
    } catch (err: any) {
      console.warn(`[studio] Failed to load transcript: ${err.message}`);
    }

    const [entitlement] = await db
      .select()
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, userId))
      .limit(1);

    const canUseAiBroll = entitlement?.aiBroll === true;

    const recentMessages = await db
      .select()
      .from(editMessages)
      .where(eq(editMessages.sessionId, sessionId))
      .orderBy(desc(editMessages.createdAt))
      .limit(5);

    const chatHistory = recentMessages.reverse().map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    const { routeStudioIntent } = await import(
      "../../server/lib/studioIntentRouter"
    );
    const edlSummary = buildEdlSummary(currentEdl);
    const intentResult = await routeStudioIntent(
      content,
      edlSummary,
      transcriptWords,
      chatHistory
    );

    console.log(
      `[studio] Intent: ${intentResult.intent}, confidence: ${intentResult.confidence}, ops: ${intentResult.operations.length}`
    );

    if (editRunId) {
      try {
        await db
          .update(editRuns)
          .set({
            intentJson: intentResult as any,
            step1Status: "completed",
            step1Progress: 100,
            step1Summary: `Intent: ${intentResult.intent} (${intentResult.confidence})`,
            currentStep: 2,
            step2Status: "running",
            step2Summary: "Generating assets...",
            status: "generating_assets",
            updatedAt: new Date(),
          })
          .where(eq(editRuns.id, editRunId));
      } catch {}
    }

    await db.insert(editMessages).values({
      sessionId,
      userId,
      role: "assistant",
      content: intentResult.notes,
    });

    const {
      tightenCuts,
      addZooms,
      updateCaptionStyle,
      changeTransitions,
      changeColorGrade,
      insertBroll,
      removeBroll,
      makeEnergetic,
      makeCalmer,
    } = await import("../../server/lib/edlPatcher");

    let patchedEdl = currentEdl;

    const operationsToApply = intentResult.operations.length > 0
      ? intentResult.operations
      : [{ op: "ai_director", params: { prompt: content, intensity: 0.6 } } as any];

    if (editRunId) {
      try {
        await db
          .update(editRuns)
          .set({
            step2Status: "completed",
            step2Progress: 100,
            step2Summary: `${operationsToApply.length} operations queued`,
            currentStep: 3,
            step3Status: "running",
            step3Summary: "Applying edits...",
            status: "applying_edits",
            updatedAt: new Date(),
          })
          .where(eq(editRuns.id, editRunId));
      } catch {}
    }

    for (const op of operationsToApply) {
      try {
        switch (op.op) {
          case "tighten_cuts":
            patchedEdl = tightenCuts(
              patchedEdl,
              op.params?.aggressiveness || "moderate"
            );
            break;

          case "add_zooms":
            patchedEdl = addZooms(patchedEdl, op.params?.intensity);
            break;

          case "caption_style":
            patchedEdl = updateCaptionStyle(patchedEdl, {
              styleId: op.params?.styleId,
              fontScale: op.params?.fontScale,
              highlightColor: op.params?.highlightColor,
            });
            break;

          case "transitions":
            patchedEdl = changeTransitions(
              patchedEdl,
              op.params?.type || "fade",
              op.params?.durationFrames
            );
            break;

          case "color_grade":
            patchedEdl = changeColorGrade(
              patchedEdl,
              op.params?.preset || "cinematic"
            );
            break;

          case "insert_broll": {
            if (!canUseAiBroll) {
              await db.insert(editMessages).values({
                sessionId,
                userId,
                role: "tool",
                content: "AI b-roll is unavailable on your current plan",
                toolName: "insert_broll",
                toolPayload: { blockedByPlan: true },
              });
              break;
            }

            const prompt = op.params?.prompt || "cinematic b-roll";
            const fps = patchedEdl.fps || 30;
            const totalFrames = patchedEdl.clips.reduce(
              (s, c) => s + c.durationInFrames,
              0
            );
            const timeSec = op.params?.timeSec;
            const durationSec = op.params?.durationSec || 4;
            const startFrame = timeSec
              ? Math.round(timeSec * fps)
              : Math.round(totalFrames * 0.3);
            const durationInFrames = Math.round(durationSec * fps);
            const insertId = `studio-broll-${Date.now()}`;

            let brollSrc: string | null = null;
            try {
              const { computeCacheKey } = await import(
                "../../server/lib/lumaService"
              );
              const { enqueueLumaJob } = await import(
                "../queue/luma.queue"
              );

              const cacheKey = computeCacheKey(
                prompt,
                "9:16",
                durationSec,
                ""
              );

              const [existingByCache] = await db
                .select()
                .from(lumaGenerations)
                .where(eq(lumaGenerations.cacheKey, cacheKey))
                .limit(1);

              if (
                existingByCache &&
                existingByCache.status === "succeeded" &&
                existingByCache.assetUrl
              ) {
                brollSrc = existingByCache.assetUrl;
                console.log(
                  `[studio] B-roll cache hit for "${prompt}"`
                );
              } else {
                await db.insert(lumaGenerations).values({
                  userId,
                  videoId,
                  insertId,
                  prompt,
                  generationType: "text_to_video",
                  aspectRatio: "9:16",
                  durationSeconds: durationSec,
                  startFrame,
                  durationInFrames,
                  status: "queued",
                  cacheKey,
                });

                await enqueueLumaJob({
                  videoId,
                  insertId,
                  userId,
                  prompt,
                  aspectRatio: "9:16",
                  durationSeconds: durationSec,
                  cacheKey,
                  generationType: "text_to_video",
                });

                const MAX_BROLL_WAIT_MS = 5 * 60 * 1000;
                const POLL_INTERVAL_MS = 5000;
                const waitStart = Date.now();

                console.log(
                  `[studio] Waiting for Luma B-roll generation "${prompt}"...`
                );

                while (Date.now() - waitStart < MAX_BROLL_WAIT_MS) {
                  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

                  const [row] = await db
                    .select()
                    .from(lumaGenerations)
                    .where(eq(lumaGenerations.insertId, insertId))
                    .limit(1);

                  if (!row) break;
                  if (row.status === "succeeded" && row.assetUrl) {
                    brollSrc = row.assetUrl;
                    break;
                  }
                  if (row.status === "failed") {
                    console.warn(
                      `[studio] Luma generation failed: ${row.error}`
                    );
                    break;
                  }
                }
              }
            } catch (lumaErr: any) {
              console.warn(
                `[studio] Luma B-roll failed (non-fatal): ${lumaErr.message}`
              );
            }

            if (brollSrc) {
              patchedEdl = insertBroll(patchedEdl, [
                {
                  id: insertId,
                  src: brollSrc,
                  startFrame,
                  durationInFrames,
                  type: "luma" as const,
                  prompt,
                  mix: 1,
                  audio: { keepOriginal: true, lumaAudioGain: 0 },
                },
              ]);
            } else {
              patchedEdl = addZooms(patchedEdl, 0.4);
              console.log(
                "[studio] Luma B-roll unavailable, applied zoom fallback"
              );
            }

            await db.insert(editMessages).values({
              sessionId,
              userId,
              role: "tool",
              content: brollSrc
                ? `B-roll generated: "${prompt}"`
                : `B-roll generation pending, applied zoom fallback`,
              toolName: "insert_broll",
              toolPayload: { prompt, startFrame, durationInFrames, insertId },
            });
            break;
          }

          case "remove_broll":
            patchedEdl = removeBroll(patchedEdl, op.params?.insertIds);
            await db.insert(editMessages).values({
              sessionId,
              userId,
              role: "tool",
              content: op.params?.insertIds
                ? `Removed ${op.params.insertIds.length} b-roll clips`
                : "Removed all b-roll clips",
              toolName: "remove_broll",
              toolPayload: op.params || {},
            });
            break;

          case "ai_director": {
            const { runAiEditDirector } = await import("../../server/lib/aiEditDirector");
            const { analyzeEmphasisMoments, emphasisToCameraMoves } = await import("../../server/lib/smartZoomAnalyzer");
            const { computeCacheKey } = await import("../../server/lib/lumaService");
            const { enqueueLumaJob } = await import("../queue/luma.queue");

            const fps = patchedEdl.fps || 30;
            const totalDurationMs = patchedEdl.clips.reduce(
              (sum, c) => sum + (c.durationInFrames / fps) * 1000,
              0
            );

            const directorResult = await runAiEditDirector({
              words: transcriptWords,
              existingCameraMoves: patchedEdl.clips.flatMap((c) => c.cameraMoves || []),
              videoDurationMs: totalDurationMs,
              clipCount: patchedEdl.clips.length,
              platform: "general",
              userPrompt: (op.params?.prompt || content || "").toString(),
            });

            for (let i = 0; i < patchedEdl.clips.length - 1; i++) {
              if (directorResult.transitions[i]) {
                patchedEdl.clips[i].transitionType = directorResult.transitions[i];
              }
            }

            patchedEdl.captionStyleId = directorResult.captionStyleId;
            patchedEdl.colorGrade = directorResult.colorGrade;
            patchedEdl.musicVolume = directorResult.musicVolume;

            const clipBounds = patchedEdl.clips.map((c) => ({
              trimStartMs: (c.trimStartFrame / fps) * 1000,
              durationMs: (c.durationInFrames / fps) * 1000,
            }));

            const emphasis = await analyzeEmphasisMoments(transcriptWords);

            let runningMs = 0;
            patchedEdl.clips = patchedEdl.clips.map((clip, idx) => {
              const clipDurationMs = (clip.durationInFrames / fps) * 1000;
              const aiMoves = emphasisToCameraMoves(
                emphasis,
                clipBounds[idx].trimStartMs,
                clipBounds[idx].durationMs
              );

              const directorMoves = directorResult.additionalCameraMoves
                .filter((m) => m.startSec * 1000 >= runningMs && m.startSec * 1000 < runningMs + clipDurationMs)
                .map((m) => ({
                  ...m,
                  startSec: Math.max(0, m.startSec - runningMs / 1000),
                  endSec: Math.max(0.1, Math.min(clipDurationMs / 1000, m.endSec - runningMs / 1000)),
                }));

              runningMs += clipDurationMs;

              return {
                ...clip,
                cameraMoves: [...(clip.cameraMoves || []), ...aiMoves, ...directorMoves],
                zoomTarget: Math.max(clip.zoomTarget || 1, directorMoves.length > 0 || aiMoves.length > 0 ? 1.08 : 1),
              };
            });

            const shouldUseLumaCamera = canUseAiBroll && op.params?.useLumaCamera !== false;
            let lumaCameraInsertId: string | null = null;

            if (shouldUseLumaCamera) {
              const mapToLumaMove = (moveType?: string): string => {
                switch (moveType) {
                  case "zoom_in":
                  case "dolly_in":
                    return "push_in";
                  case "zoom_out":
                  case "dolly_out":
                    return "pull_out";
                  case "pan_left":
                    return "tracking_left";
                  case "pan_right":
                    return "tracking_right";
                  case "tilt_up":
                  case "pan_up":
                    return "crane_up";
                  case "tilt_down":
                  case "pan_down":
                    return "crane_down";
                  default:
                    return "handheld";
                }
              };

              const selectedMove = mapToLumaMove(directorResult.additionalCameraMoves[0]?.type);
              const promptSeed = (op.params?.prompt || content || "cinematic atmosphere").toString();
              const lumaPrompt = `${promptSeed}, cinematic b-roll, premium lighting, realistic motion`;
              const durationSec = 4;
              const startFrame = emphasis.length > 0
                ? Math.max(0, Math.round((emphasis[0].startTime / 1000) * fps))
                : Math.round(patchedEdl.clips.reduce((s, c) => s + c.durationInFrames, 0) * 0.25);
              const insertId = `studio-ai-cam-${Date.now()}`;
              const cacheKey = computeCacheKey(lumaPrompt, "9:16", durationSec, selectedMove);

              try {
                const [existingByCache] = await db
                  .select()
                  .from(lumaGenerations)
                  .where(eq(lumaGenerations.cacheKey, cacheKey))
                  .limit(1);

                let lumaSrc: string | null = null;

                if (existingByCache?.status === "succeeded" && existingByCache.assetUrl) {
                  lumaSrc = existingByCache.assetUrl;
                } else {
                  await db.insert(lumaGenerations).values({
                    userId,
                    videoId,
                    insertId,
                    prompt: lumaPrompt,
                    generationType: "text_to_video",
                    aspectRatio: "9:16",
                    durationSeconds: durationSec,
                    startFrame,
                    durationInFrames: Math.round(durationSec * fps),
                    status: "queued",
                    cacheKey,
                    cameraMove: selectedMove,
                  });

                  await enqueueLumaJob({
                    videoId,
                    insertId,
                    userId,
                    prompt: lumaPrompt,
                    aspectRatio: "9:16",
                    durationSeconds: durationSec,
                    cacheKey,
                    generationType: "text_to_video",
                    cameraMove: selectedMove,
                  });

                  const LUMA_WAIT_MS = 60_000;
                  const POLL_MS = 3000;
                  const startedAt = Date.now();

                  while (Date.now() - startedAt < LUMA_WAIT_MS) {
                    await new Promise((r) => setTimeout(r, POLL_MS));
                    const [row] = await db
                      .select()
                      .from(lumaGenerations)
                      .where(eq(lumaGenerations.insertId, insertId))
                      .limit(1);

                    if (!row) break;
                    if (row.status === "succeeded" && row.assetUrl) {
                      lumaSrc = row.assetUrl;
                      lumaCameraInsertId = insertId;
                      break;
                    }
                    if (row.status === "failed") break;
                  }
                }

                if (lumaSrc) {
                  patchedEdl = insertBroll(patchedEdl, [{
                    id: lumaCameraInsertId || `studio-ai-cam-cached-${Date.now()}`,
                    src: lumaSrc,
                    startFrame,
                    durationInFrames: Math.round(durationSec * fps),
                    type: "luma" as const,
                    prompt: lumaPrompt,
                    mix: 0.9,
                    audio: { keepOriginal: true, lumaAudioGain: 0 },
                  }]);
                }
              } catch (lumaCameraErr: any) {
                console.warn(`[studio] Luma camera pass failed (non-fatal): ${lumaCameraErr.message}`);
              }
            }

            await db.insert(editMessages).values({
              sessionId,
              userId,
              role: "tool",
              content: `AI director pass applied (${directorResult.additionalCameraMoves.length} director moves, ${emphasis.length} transcript emphasis moments${lumaCameraInsertId ? ", Luma camera b-roll added" : ""})` ,
              toolName: "ai_director",
              toolPayload: {
                prompt: op.params?.prompt || content,
                transitions: directorResult.transitions.length,
                captionStyleId: directorResult.captionStyleId,
                colorGrade: directorResult.colorGrade,
                emphasisMoments: emphasis.length,
                lumaCameraInsertId,
              },
            });
            break;
          }

          default:
            console.warn(`[studio] Unknown operation: ${op.op}`);
        }

        if (
          op.op !== "insert_broll" &&
          op.op !== "remove_broll" &&
          op.op !== "ai_director"
        ) {
          await db.insert(editMessages).values({
            sessionId,
            userId,
            role: "tool",
            content: `Applied ${op.op}${op.params ? ` (${JSON.stringify(op.params)})` : ""}`,
            toolName: op.op,
            toolPayload: op.params || {},
          });
        }
      } catch (opErr: any) {
        console.error(
          `[studio] Operation ${op.op} failed: ${opErr.message}`
        );
        await db.insert(editMessages).values({
          sessionId,
          userId,
          role: "tool",
          content: `Failed to apply ${op.op}: ${opErr.message}`,
          toolName: op.op,
          toolPayload: { error: opErr.message },
        });
      }
    }

    if (
      intentResult.intent === "MAKE_ENERGETIC" &&
      !intentResult.operations.some((o) => o.op === "tighten_cuts")
    ) {
      patchedEdl = makeEnergetic(patchedEdl);
    }
    if (
      intentResult.intent === "MAKE_CALMER" &&
      !intentResult.operations.some((o) => o.op === "tighten_cuts")
    ) {
      patchedEdl = makeCalmer(patchedEdl);
    }

    if (editRunId) {
      try {
        await db
          .update(editRuns)
          .set({
            step3Status: "completed",
            step3Progress: 100,
            step3Summary: `Applied ${operationsToApply.length} operations`,
            currentStep: 4,
            step4Status: "running",
            step4Summary: "Saving version...",
            status: "saving",
            updatedAt: new Date(),
          })
          .where(eq(editRuns.id, editRunId));
      } catch {}
    }

    const newVersionNumber = currentVersionNumber + 1;
    const [newVersion] = await db
      .insert(edlVersions)
      .values({
        sessionId,
        userId,
        baseVersionId: session.activeVersionId,
        versionNumber: newVersionNumber,
        edlJson: patchedEdl as any,
        renderStatus: "queued",
        renderProgress: 0,
        notes: intentResult.notes,
      })
      .returning();

    await db
      .update(editSessions)
      .set({
        activeVersionId: newVersion.id,
        status: "rendering",
        updatedAt: new Date(),
      })
      .where(eq(editSessions.id, sessionId));

    let previewUrl: string | null = null;
    try {
      const { renderViaCloudRun, isRenderServiceAvailable } = await import(
        "../../server/lib/renderClient"
      );
      const { resolveCaptionStyleSpec } = await import("../../server/lib/captionStyleResolver");

      if (isRenderServiceAvailable()) {
        const captionStyleSpec = resolveCaptionStyleSpec(patchedEdl.captionStyleId);

        const renderResult = await renderViaCloudRun({
          edl: patchedEdl,
          composition: "TikTokStyle",
          userId,
          videoId,
          watermark: true,
          captionStyleSpec,
        });

        if (renderResult.signedUrl) {
          previewUrl = renderResult.signedUrl;
        }
      }
    } catch (renderErr: any) {
      console.warn(`[studio] Cloud render failed (non-fatal): ${renderErr.message}`);
    }

    if (!previewUrl && patchedEdl.clips.length > 0) {
      try {
        const mainClipSrc = patchedEdl.clips[0].src;
        if (mainClipSrc && !mainClipSrc.startsWith("http")) {
          previewUrl = await getVideoSignedUrl(mainClipSrc);
        } else {
          previewUrl = mainClipSrc || null;
        }
      } catch {}
    }

    await db
      .update(edlVersions)
      .set({
        renderStatus: "succeeded",
        renderProgress: 100,
        ...(previewUrl ? { previewUrl } : {}),
      })
      .where(eq(edlVersions.id, newVersion.id));

    await db
      .update(editSessions)
      .set({ status: "idle", updatedAt: new Date() })
      .where(eq(editSessions.id, sessionId));

    if (editRunId) {
      try {
        await db
          .update(editRuns)
          .set({
            step4Status: "completed",
            step4Progress: 100,
            step4Summary: `Version ${newVersionNumber} saved`,
            status: "completed",
            edlJson: patchedEdl as any,
            planJson: {
              operations: intentResult.operations,
              intent: intentResult.intent,
            } as any,
            updatedAt: new Date(),
          })
          .where(eq(editRuns.id, editRunId));
      } catch {}
    }

    console.log(
      `[studio] Message ${messageId} processed. Created version ${newVersionNumber}`
    );
  } catch (err: any) {
    console.error(`[studio] Job failed: ${err.message}`);

    await db
      .update(editSessions)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(editSessions.id, sessionId));

    await db.insert(editMessages).values({
      sessionId,
      userId,
      role: "assistant",
      content: `Sorry, something went wrong: ${err.message}. Please try again.`,
    });

    if (editRunId) {
      try {
        await db
          .update(editRuns)
          .set({
            status: "failed",
            error: err.message,
            updatedAt: new Date(),
          })
          .where(eq(editRuns.id, editRunId));
      } catch {}
    }

    throw err;
  }
}

export async function processStudioJobInline(
  data: StudioJobData
): Promise<void> {
  console.warn("[studio] Processing inline (no Redis queue)");
  const fakeJob = { data } as Job<StudioJobData>;
  await processJob(fakeJob);
}

export function startStudioWorker() {
  if (!process.env.REDIS_URL) {
    console.error("[studio-worker] REDIS_URL not set. Cannot start worker.");
    return;
  }

  console.log(
    `[studio-worker] Starting studio-edit worker (concurrency=${CONCURRENCY})`
  );

  const worker = new Worker<StudioJobData>(
    QUEUE_NAME,
    async (job) => processJob(job),
    {
      connection: getRedisConnection(),
      concurrency: CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(
      `[studio-worker] Job for message ${job.data.messageId} completed`
    );
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[studio-worker] Job for message ${job?.data.messageId} failed:`,
      err.message
    );
  });

  let lastWorkerErr = 0;
  worker.on("error", (err) => {
    const now = Date.now();
    if (now - lastWorkerErr > 30000) {
      console.warn("[studio-worker] Worker error:", err.message);
      lastWorkerErr = now;
    }
  });

  return worker;
}
