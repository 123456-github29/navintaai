import type { CaptionSegment, WordTiming } from "../../schemas/edl.schema";

export interface TranscriptWord {
  text: string;
  startMs: number;
  endMs: number;
}

export type CaptionStyle = "default" | "clean" | "impact" | "karaoke";

export interface CaptionExecutorOptions {
  fps: number;
  stylePackId?: string;
  maxWordsPerChunk?: number;
  maxChunkDurationMs?: number;
}

function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

function chunkWords(
  words: TranscriptWord[],
  maxWords: number,
  maxDurationMs: number
): TranscriptWord[][] {
  const chunks: TranscriptWord[][] = [];
  let current: TranscriptWord[] = [];

  for (const word of words) {
    if (current.length === 0) {
      current.push(word);
      continue;
    }

    const chunkStart = current[0].startMs;
    const wouldEnd = word.endMs;
    const wouldDuration = wouldEnd - chunkStart;

    if (current.length >= maxWords || wouldDuration > maxDurationMs) {
      chunks.push(current);
      current = [word];
    } else {
      current.push(word);
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

export function executeCaptionGeneration(
  words: TranscriptWord[],
  options: CaptionExecutorOptions
): CaptionSegment[] {
  const {
    fps,
    stylePackId = "default",
    maxWordsPerChunk = 5,
    maxChunkDurationMs = 3000,
  } = options;

  if (!words || words.length === 0) {
    return [];
  }

  const chunks = chunkWords(words, maxWordsPerChunk, maxChunkDurationMs);

  return chunks.map((chunk, idx) => {
    const text = chunk.map((w) => w.text).join(" ");
    const startFrame = msToFrame(chunk[0].startMs, fps);
    const endFrame = msToFrame(chunk[chunk.length - 1].endMs, fps);

    const activeWordTimings: WordTiming[] = chunk.map((w) => ({
      text: w.text,
      startFrame: msToFrame(w.startMs, fps),
      endFrame: msToFrame(w.endMs, fps),
    }));

    return {
      id: `cap-${idx}`,
      text,
      startFrame: Math.max(0, startFrame),
      endFrame: Math.max(1, endFrame),
      stylePackId,
      activeWordTimings,
    } as CaptionSegment;
  });
}
