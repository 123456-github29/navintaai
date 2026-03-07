import type { Word, CaptionSegment } from "./types";

interface SegmenterOptions {
  maxWordsPerLine: number;
  maxDuration: number;
  lineCount: 1 | 2;
}

const PUNCTUATION_BREAKS = /[.!?,;:\u2014\u2013]/;

const DEFAULT_OPTIONS: SegmenterOptions = {
  maxWordsPerLine: 5,
  maxDuration: 4.0,
  lineCount: 2,
};

export function segmentWords(
  words: Word[],
  options: Partial<SegmenterOptions> = {}
): CaptionSegment[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const maxWords = opts.maxWordsPerLine * opts.lineCount;
  const segments: CaptionSegment[] = [];

  let currentWords: Word[] = [];
  let segmentIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentWords.push(word);

    const segStart = currentWords[0].start;
    const duration = word.end - segStart;
    const endsWithPunctuation = PUNCTUATION_BREAKS.test(
      word.text[word.text.length - 1] || ""
    );
    const nextWordGap =
      i < words.length - 1 ? words[i + 1].start - word.end : 999;
    const isLast = i === words.length - 1;

    const hasMoreWords = i < words.length - 1;
    const wouldLeaveSingle = hasMoreWords && i + 2 === words.length;

    const shouldBreak =
      currentWords.length >= maxWords ||
      duration >= opts.maxDuration ||
      (endsWithPunctuation && currentWords.length >= 2 && !wouldLeaveSingle) ||
      (nextWordGap > 0.8 && !wouldLeaveSingle) ||
      isLast;

    if (shouldBreak && currentWords.length > 0) {
      segments.push({
        id: `seg-${segmentIndex++}`,
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        words: [...currentWords],
      });
      currentWords = [];
    }
  }

  if (currentWords.length > 0) {
    segments.push({
      id: `seg-${segmentIndex}`,
      start: currentWords[0].start,
      end: currentWords[currentWords.length - 1].end,
      words: currentWords,
    });
  }

  return segments;
}
