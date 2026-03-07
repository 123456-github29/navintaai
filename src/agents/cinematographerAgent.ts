import type { EditDecision, VideoSegment, CaptionSegment, Transition } from "../schemas/editDecision.schema";

export interface ClipInput {
  id: string;
  storagePath: string;
  signedUrl: string;
  durationSeconds: number;
  shotId?: string | null;
  transcript?: string | null;
}

export interface PostInput {
  id: string;
  title: string;
  shotList?: Array<{
    id: string;
    shotNumber: number;
    instruction: string;
    duration: number;
  }>;
  musicVibe?: string | null;
}

export interface StyleInput {
  aspectRatio: "9:16" | "1:1" | "16:9";
  captionTemplateId: string;
  colorPreset: "none" | "warm" | "cool" | "vintage" | "noir" | "vivid";
  transitionType: "crossfade" | "blur-dissolve" | "cut";
  trimIntensity: number;
  plan: "free" | "starter" | "pro" | "studio";
}

const DEFAULT_STYLE: StyleInput = {
  aspectRatio: "9:16",
  captionTemplateId: "opus-clean",
  colorPreset: "none",
  transitionType: "crossfade",
  trimIntensity: 0.5,
  plan: "free",
};

const PLAN_RESTRICTIONS: Record<string, Partial<StyleInput>> = {
  free: {
    colorPreset: "none",
  },
  starter: {},
  pro: {},
  studio: {},
};

const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

const FPS = 30;

function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
}

function clampStyle(style: StyleInput): StyleInput {
  const restrictions = PLAN_RESTRICTIONS[style.plan] || {};
  return { ...style, ...restrictions };
}

function generateCaptionsFromTranscript(
  transcript: string,
  startFrame: number,
  endFrame: number,
  stylePackId: string,
  animationType: string
): CaptionSegment[] {
  const words = transcript.trim().split(/\s+/);
  if (words.length === 0) return [];

  const totalFrames = endFrame - startFrame;
  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    current.push(word);
    if (current.length >= 4) {
      chunks.push(current.join(" "));
      current = [];
    }
  }
  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  const framesPerChunk = Math.floor(totalFrames / chunks.length);

  return chunks.map((text, i) => ({
    id: `cap-${startFrame}-${i}`,
    text,
    startFrame: startFrame + i * framesPerChunk,
    endFrame: Math.min(startFrame + (i + 1) * framesPerChunk, endFrame),
    stylePackId,
    animationType: animationType as CaptionSegment["animationType"],
  }));
}

export function generateEDL(
  clips: ClipInput[],
  post: PostInput,
  style: Partial<StyleInput> = {}
): EditDecision {
  const resolvedStyle = clampStyle({ ...DEFAULT_STYLE, ...style });
  const dimensions = ASPECT_DIMENSIONS[resolvedStyle.aspectRatio] || ASPECT_DIMENSIONS["9:16"];

  const sortedClips = [...clips].sort((a, b) => {
    if (a.shotId && b.shotId) {
      const shotListMap = new Map(
        (post.shotList || []).map((s) => [s.id, s.shotNumber])
      );
      return (shotListMap.get(a.shotId) || 0) - (shotListMap.get(b.shotId) || 0);
    }
    return 0;
  });

  const trimStartSeconds = resolvedStyle.trimIntensity * 0.5;
  const trimEndSeconds = resolvedStyle.trimIntensity * 0.5;

  const videoSegments: VideoSegment[] = [];
  const captions: CaptionSegment[] = [];
  const transitions: Transition[] = [];
  const assetMap: Record<string, string> = {};

  let currentFrame = 0;

  for (let i = 0; i < sortedClips.length; i++) {
    const clip = sortedClips[i];
    assetMap[clip.id] = clip.signedUrl;

    const rawDuration = clip.durationSeconds;
    const effectiveDuration = Math.max(
      0.5,
      rawDuration - trimStartSeconds - trimEndSeconds
    );
    const frameDuration = secondsToFrames(effectiveDuration);
    const trimStartFrames = secondsToFrames(trimStartSeconds);

    const cameraMotion: VideoSegment["cameraMotion"] =
      i % 3 === 0 ? "slow-zoom-in" : i % 3 === 1 ? "none" : "slow-zoom-out";

    videoSegments.push({
      id: `seg-${i}`,
      assetId: clip.id,
      startFrame: currentFrame,
      endFrame: currentFrame + frameDuration,
      trimStart: trimStartFrames,
      volume: 1,
      cameraMotion,
      colorPreset: resolvedStyle.colorPreset as VideoSegment["colorPreset"],
    });

    if (clip.transcript) {
      const clipCaptions = generateCaptionsFromTranscript(
        clip.transcript,
        currentFrame + 5,
        currentFrame + frameDuration - 5,
        resolvedStyle.captionTemplateId,
        "none"
      );
      captions.push(...clipCaptions);
    }

    if (i > 0 && resolvedStyle.transitionType !== "cut") {
      const transitionDuration = resolvedStyle.transitionType === "blur-dissolve" ? 12 : 10;
      transitions.push({
        id: `tr-${i}`,
        type: resolvedStyle.transitionType as Transition["type"],
        atFrame: currentFrame - Math.floor(transitionDuration / 2),
        durationFrames: transitionDuration,
      });
    }

    currentFrame += frameDuration;
  }

  const totalFrames = currentFrame;

  const edl: EditDecision = {
    version: 1,
    fps: FPS,
    width: dimensions.width,
    height: dimensions.height,
    durationInFrames: totalFrames,
    tracks: {
      video: videoSegments,
      captions,
      transitions,
      audio: [],
    },
    assetMap,
  };

  return edl;
}
