import type {
  EDL,
  Clip,
  TransitionType,
  ColorGradePreset,
  BrollInsert,
} from "../../src/remotion/types/edl";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function tightenCuts(
  edl: EDL,
  aggressiveness: "gentle" | "moderate" | "aggressive"
): EDL {
  const result = deepClone(edl);
  const fps = result.fps || 30;
  const crossfade =
    aggressiveness === "gentle" ? 4 : aggressiveness === "moderate" ? 6 : 8;

  const silenceThresholdFrames =
    aggressiveness === "aggressive" ? fps * 1.0 : fps * 1.5;

  const tailBufferFrames = 15;

  const newClips: Clip[] = [];

  for (const clip of result.clips) {
    const words: Array<{ startFrame: number; endFrame: number }> =
      Array.isArray(clip.words) ? clip.words : [];

    const validWords = words.filter(
      (w) => typeof w.startFrame === "number" && typeof w.endFrame === "number" && w.endFrame > w.startFrame
    );

    if (validWords.length === 0) {
      const factor =
        aggressiveness === "gentle" ? 0.9 : aggressiveness === "moderate" ? 0.8 : 0.7;
      clip.durationInFrames = Math.max(
        Math.round(clip.durationInFrames * factor),
        Math.round(fps * 0.5)
      );
      clip.crossfadeFrames = crossfade;
      newClips.push(clip);
      continue;
    }

    const lastWordEnd = validWords[validWords.length - 1].endFrame;

    if (aggressiveness === "gentle") {
      clip.durationInFrames = Math.max(lastWordEnd + tailBufferFrames, Math.round(fps * 0.5));
      clip.crossfadeFrames = crossfade;
      newClips.push(clip);
      continue;
    }

    const segments: Array<{ startFrame: number; endFrame: number }> = [];
    let segStart = validWords[0].startFrame;
    let segEnd = validWords[0].endFrame;

    for (let i = 1; i < validWords.length; i++) {
      const gap = validWords[i].startFrame - validWords[i - 1].endFrame;
      if (gap > silenceThresholdFrames) {
        segments.push({ startFrame: segStart, endFrame: segEnd + tailBufferFrames });
        segStart = validWords[i].startFrame;
      }
      segEnd = validWords[i].endFrame;
    }
    segments.push({ startFrame: segStart, endFrame: segEnd + tailBufferFrames });

    if (segments.length === 1) {
      clip.trimStartFrame = (clip.trimStartFrame || 0) + segments[0].startFrame;
      clip.durationInFrames = Math.max(
        segments[0].endFrame - segments[0].startFrame,
        Math.round(fps * 0.5)
      );
      clip.crossfadeFrames = crossfade;
      newClips.push(clip);
    } else {
      segments.forEach((seg, idx) => {
        const segWords = validWords.filter(
          (w) => w.startFrame >= seg.startFrame && w.endFrame <= seg.endFrame + tailBufferFrames
        );
        const segWordsLocal = segWords.map((w) => ({
          ...w,
          startFrame: w.startFrame - seg.startFrame,
          endFrame: w.endFrame - seg.startFrame,
        }));

        newClips.push({
          ...clip,
          id: idx === 0 ? clip.id : `${clip.id}-seg${idx}`,
          trimStartFrame: (clip.trimStartFrame || 0) + seg.startFrame,
          durationInFrames: Math.max(seg.endFrame - seg.startFrame, Math.round(fps * 0.5)),
          words: segWordsLocal,
          crossfadeFrames: crossfade,
        } as Clip);
      });
    }
  }

  result.clips = newClips;
  return result;
}

export function addZooms(edl: EDL, intensity?: number): EDL {
  const result = deepClone(edl);
  const level = intensity ?? 0.5;
  const zoomMin = 1.03;
  const zoomMax = 1.03 + 0.12 * level;

  for (let i = 0; i < result.clips.length; i++) {
    const clip = result.clips[i];
    const t = result.clips.length > 1 ? i / (result.clips.length - 1) : 0.5;
    clip.zoomTarget = parseFloat(
      (zoomMin + (zoomMax - zoomMin) * t).toFixed(3)
    );

    if (!clip.cameraMoves) clip.cameraMoves = [];
    const startSec = clip.trimStartFrame / result.fps;
    const endSec = startSec + clip.durationInFrames / result.fps;
    const moveTypes = ["zoom_in", "pan_left", "pan_right", "zoom_out"] as const;
    clip.cameraMoves.push({
      type: moveTypes[i % moveTypes.length],
      startSec,
      endSec,
      fromScale: 1,
      toScale: clip.zoomTarget,
    });
  }

  return result;
}

export function updateCaptionStyle(
  edl: EDL,
  updates: { styleId?: string; fontScale?: number; highlightColor?: string }
): EDL {
  const result = deepClone(edl);
  if (updates.styleId) {
    result.captionStyleId = updates.styleId;
  }
  return result;
}

export function changeTransitions(
  edl: EDL,
  type: TransitionType,
  durationFrames?: number
): EDL {
  const result = deepClone(edl);
  for (const clip of result.clips) {
    clip.transitionType = type;
    if (durationFrames !== undefined) {
      clip.transitionDurationFrames = durationFrames;
    }
  }
  return result;
}

export function changeColorGrade(edl: EDL, preset: ColorGradePreset): EDL {
  const result = deepClone(edl);
  result.colorGrade = preset;
  return result;
}

export function insertBroll(edl: EDL, inserts: BrollInsert[]): EDL {
  const result = deepClone(edl);
  if (!result.lumaBroll) result.lumaBroll = [];
  result.lumaBroll.push(...inserts);
  return result;
}

export function removeBroll(edl: EDL, insertIds?: string[]): EDL {
  const result = deepClone(edl);
  if (!result.lumaBroll) return result;
  if (insertIds && insertIds.length > 0) {
    const idSet = new Set(insertIds);
    result.lumaBroll = result.lumaBroll.filter((b) => !idSet.has(b.id));
  } else {
    result.lumaBroll = [];
  }
  return result;
}

export function makeEnergetic(edl: EDL): EDL {
  let result = tightenCuts(edl, "aggressive");
  result = addZooms(result, 0.85);
  result = updateCaptionStyle(result, { styleId: "kinetic_bounce" });
  result = changeTransitions(result, "slide", 6);
  return result;
}

export function makeCalmer(edl: EDL): EDL {
  let result = tightenCuts(edl, "gentle");
  result = addZooms(result, 0.15);
  result = updateCaptionStyle(result, { styleId: "cinematic_plate" });
  result = changeTransitions(result, "fade", 12);
  result.colorGrade = "pastel";
  return result;
}
