import { EDLSchema, type EDL, type Clip, type CaptionSegment } from "../schemas/edl.schema";
import type { EditPlan } from "../schemas/editPlan.schema";
import type { TimelineData, TranscriptWord } from "./timelineExtractor";
import { msToFrame } from "./timelineExtractor";
import { executeCaptionGeneration } from "./apiExecutors/captions.executor";

const BUFFER_MS = 150;

export interface EdlBuilderInput {
  videoSrc: string;
  fps: number;
  totalDurationMs: number;
  words: TranscriptWord[];
  plan: EditPlan;
  assetMap?: Record<string, string>;
}

function buildClipsFromPlan(input: EdlBuilderInput): Clip[] {
  const { videoSrc, fps, totalDurationMs, words, plan } = input;

  if (plan.clipCuts.length > 0) {
    return plan.clipCuts.map((cut, idx) => {
      const trimStartFrame = msToFrame(cut.trimStartMs, fps);
      const durationInFrames = Math.max(1, msToFrame(cut.durationMs, fps));

      const cameraMove = plan.cameraMoves.find((cm) => cm.clipIndex === idx);
      const transition = plan.transitions.find((t) => t.atClipIndex === idx);

      const clipWords = words.filter(
        (w) => w.startMs >= cut.trimStartMs && w.endMs <= cut.trimStartMs + cut.durationMs
      );

      return {
        id: `clip-${idx}`,
        src: videoSrc,
        trimStartFrame,
        durationInFrames,
        volume: 1,
        cameraMotionPreset: cameraMove?.motion || "none",
        colorPreset: plan.colorPreset || "none",
        zoomTarget: cameraMove ? 1 + cameraMove.intensity * 0.15 : 1,
        words: clipWords.map((w) => ({
          text: w.text,
          startFrame: msToFrame(w.startMs, fps),
          endFrame: msToFrame(w.endMs, fps),
        })),
        ...(transition
          ? {
              transitionType: transition.type,
              transitionDurationFrames: Math.max(1, msToFrame(transition.durationMs, fps)),
            }
          : {}),
      } as Clip;
    });
  }

  const totalFrames = msToFrame(totalDurationMs, fps);
  return [
    {
      id: "clip-0",
      src: videoSrc,
      trimStartFrame: 0,
      durationInFrames: Math.max(1, totalFrames),
      volume: 1,
      cameraMotionPreset: plan.cameraMoves[0]?.motion || "none",
      colorPreset: plan.colorPreset || "none",
      zoomTarget: 1,
      words: words.map((w) => ({
        text: w.text,
        startFrame: msToFrame(w.startMs, fps),
        endFrame: msToFrame(w.endMs, fps),
      })),
    } as Clip,
  ];
}

function buildCaptions(
  words: TranscriptWord[],
  plan: EditPlan,
  fps: number
): CaptionSegment[] {
  if (!plan.captionPlan.enabled) return [];

  return executeCaptionGeneration(
    words.map((w) => ({ text: w.text, startMs: w.startMs, endMs: w.endMs })),
    {
      fps,
      stylePackId: plan.captionPlan.stylePackId,
      maxWordsPerChunk: 5,
      maxChunkDurationMs: 3000,
    }
  );
}

export function buildEDL(input: EdlBuilderInput): EDL {
  const { fps, words, plan, assetMap } = input;

  const clips = buildClipsFromPlan(input);

  const durationInFrames = clips.reduce((sum, c) => sum + c.durationInFrames, 0);

  const captions = buildCaptions(words, plan, fps);

  const transitions = plan.transitions.map((t) => ({
    type: t.type as any,
    atClipIndex: t.atClipIndex,
    durationInFrames: Math.max(1, msToFrame(t.durationMs, fps)),
  }));

  const overlays = plan.brollSlots
    .filter((slot) => assetMap?.[`broll-${slot.query}`])
    .map((slot, idx) => ({
      type: "video" as const,
      src: assetMap![`broll-${slot.query}`],
      startFrame: msToFrame(
        clips
          .slice(0, slot.afterClipIndex + 1)
          .reduce((sum, c) => sum + (c.durationInFrames / fps) * 1000, 0),
        fps
      ),
      durationInFrames: Math.max(1, msToFrame(slot.durationMs, fps)),
      positionPreset: "center" as const,
      motionPreset: "none" as const,
      opacity: 1,
    }));

  const rawEdl = {
    version: 2 as const,
    fps,
    width: 1080,
    height: 1920,
    durationInFrames: Math.max(1, durationInFrames),
    clips,
    captions,
    transitions,
    overlays,
    musicSrc: null,
    captionStyleId: plan.captionPlan.stylePackId,
    colorGrade: plan.colorPreset !== "none" ? (plan.colorPreset as any) : undefined,
    lumaBroll: [],
    assetMap: assetMap || {},
  };

  const result = EDLSchema.safeParse(rawEdl);
  if (!result.success) {
    console.warn("[edlBuilder] Validation warnings:", result.error.message);
    return rawEdl as EDL;
  }

  return result.data;
}
