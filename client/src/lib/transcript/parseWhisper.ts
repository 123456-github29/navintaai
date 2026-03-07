import type { Word, WhisperTranscript, WhisperWord } from "./types";

let wordCounter = 0;

function generateWordId(): string {
  return `w-${++wordCounter}`;
}

export function parseWhisperTranscript(transcript: WhisperTranscript): Word[] {
  wordCounter = 0;
  const words: Word[] = [];

  for (const segment of transcript.segments) {
    if (segment.words && segment.words.length > 0) {
      for (const w of segment.words) {
        words.push({
          id: generateWordId(),
          text: w.word.trim(),
          start: w.start,
          end: w.end,
          confidence: w.probability,
        });
      }
    } else {
      const segmentWords = segment.text.trim().split(/\s+/);
      const segDuration = segment.end - segment.start;
      const wordDuration = segDuration / segmentWords.length;

      for (let i = 0; i < segmentWords.length; i++) {
        if (!segmentWords[i]) continue;
        words.push({
          id: generateWordId(),
          text: segmentWords[i],
          start: segment.start + i * wordDuration,
          end: segment.start + (i + 1) * wordDuration,
          confidence: undefined,
        });
      }
    }
  }

  return words;
}

export function parseWhisperWords(whisperWords: WhisperWord[]): Word[] {
  wordCounter = 0;
  return whisperWords
    .filter((w) => w.word.trim().length > 0)
    .map((w) => ({
      id: generateWordId(),
      text: w.word.trim(),
      start: w.start,
      end: w.end,
      confidence: w.probability,
    }));
}

export function parseWordArray(
  words: Array<{ text: string; start: number; end: number; confidence?: number }>
): Word[] {
  wordCounter = 0;
  return words.map((w) => ({
    id: generateWordId(),
    text: w.text.trim(),
    start: w.start,
    end: w.end,
    confidence: w.confidence,
  }));
}
