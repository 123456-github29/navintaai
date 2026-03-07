export interface TranscriptWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface Pause {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface SuggestedCut {
  atMs: number;
  reason: "long_pause" | "sentence_end" | "topic_shift";
}

export interface TimelineData {
  fps: number;
  totalDurationMs: number;
  words: TranscriptWord[];
  pauses: Pause[];
  suggestedCuts: SuggestedCut[];
}

const DEFAULT_FPS = 30;
const PAUSE_THRESHOLD_MS = 400;
const LONG_PAUSE_MS = 800;
const SENTENCE_ENDERS = /[.!?]$/;

export function extractTimeline(
  rawWords: Array<{ text: string; start: number; end: number }>,
  fps: number = DEFAULT_FPS
): TimelineData {
  if (!rawWords || rawWords.length === 0) {
    return { fps, totalDurationMs: 0, words: [], pauses: [], suggestedCuts: [] };
  }

  const words: TranscriptWord[] = rawWords.map((w) => ({
    text: w.text,
    startMs: w.start,
    endMs: w.end,
  }));

  const pauses: Pause[] = [];
  const suggestedCuts: SuggestedCut[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].startMs - words[i].endMs;
    if (gap >= PAUSE_THRESHOLD_MS) {
      pauses.push({
        startMs: words[i].endMs,
        endMs: words[i + 1].startMs,
        durationMs: gap,
      });
    }

    if (gap >= LONG_PAUSE_MS) {
      suggestedCuts.push({
        atMs: words[i].endMs,
        reason: "long_pause",
      });
    } else if (SENTENCE_ENDERS.test(words[i].text.trim()) && gap >= PAUSE_THRESHOLD_MS) {
      suggestedCuts.push({
        atMs: words[i].endMs,
        reason: "sentence_end",
      });
    }
  }

  const totalDurationMs =
    words.length > 0 ? words[words.length - 1].endMs : 0;

  return { fps, totalDurationMs, words, pauses, suggestedCuts };
}

export function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

export function frameToMs(frame: number, fps: number): number {
  return Math.round((frame / fps) * 1000);
}
