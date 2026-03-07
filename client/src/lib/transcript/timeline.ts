import type { CaptionSegment, TimelineState } from "./types";

export function getTimelineState(
  currentTime: number,
  segments: CaptionSegment[]
): TimelineState {
  const empty: TimelineState = {
    activeSegmentIndex: -1,
    activeWordIndex: -1,
    wordProgress: 0,
    segment: null,
  };

  if (segments.length === 0) return empty;

  let segIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (currentTime >= segments[i].start - 0.05 && currentTime <= segments[i].end + 0.05) {
      segIdx = i;
      break;
    }
  }

  if (segIdx === -1) {
    for (let i = 0; i < segments.length; i++) {
      if (currentTime < segments[i].start) {
        if (i > 0 && currentTime - segments[i - 1].end < 0.3) {
          segIdx = i - 1;
        }
        break;
      }
    }
  }

  if (segIdx === -1) return empty;

  const segment = segments[segIdx];
  let wordIdx = -1;
  let wordProgress = 0;

  for (let i = 0; i < segment.words.length; i++) {
    const word = segment.words[i];
    if (currentTime >= word.start - 0.02 && currentTime <= word.end + 0.02) {
      wordIdx = i;
      const wordDuration = word.end - word.start;
      wordProgress =
        wordDuration > 0
          ? Math.max(0, Math.min(1, (currentTime - word.start) / wordDuration))
          : 1;
      break;
    }
  }

  if (wordIdx === -1) {
    for (let i = 0; i < segment.words.length; i++) {
      if (currentTime < segment.words[i].start) {
        wordIdx = Math.max(0, i - 1);
        wordProgress = 1;
        break;
      }
    }
    if (wordIdx === -1 && currentTime >= segment.words[segment.words.length - 1]?.end) {
      wordIdx = segment.words.length - 1;
      wordProgress = 1;
    }
  }

  return {
    activeSegmentIndex: segIdx,
    activeWordIndex: wordIdx,
    wordProgress,
    segment,
  };
}
