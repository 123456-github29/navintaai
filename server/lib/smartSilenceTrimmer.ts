import { retryWithBackoff } from "./geminiRetry";
import { chatJSON } from "./openaiClient";

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

interface SilenceGap {
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  contextBefore: string;
  contextAfter: string;
  wordBefore: TranscriptWord;
  wordAfter: TranscriptWord;
}

interface SilenceDecision {
  action: "KEEP" | "SHORTEN" | "REMOVE";
  recommendedMs?: number;
}

interface SmartClip {
  id: string;
  words: TranscriptWord[];
  trimStartMs: number;
  trimEndMs: number;
  gapAfterMs: number;
  crossfadeFrames: number;
  audioFadeMs: number;
}

const MIN_GAP_MS = 200;
const CONTEXT_WINDOW_MS = 4000;
const BUFFER_MS = 100;
const FPS = 30;
const BATCH_SIZE = 15;


function detectSilenceGaps(transcript: TranscriptWord[]): SilenceGap[] {
  const gaps: SilenceGap[] = [];

  for (let i = 0; i < transcript.length - 1; i++) {
    const current = transcript[i];
    const next = transcript[i + 1];
    const gapMs = next.start - current.end;

    if (gapMs >= MIN_GAP_MS) {
      const contextBeforeWords = transcript
        .filter((w) => w.end <= current.end && w.start >= current.end - CONTEXT_WINDOW_MS)
        .map((w) => w.text)
        .join(" ");

      const contextAfterWords = transcript
        .filter((w) => w.start >= next.start && w.end <= next.start + CONTEXT_WINDOW_MS)
        .map((w) => w.text)
        .join(" ");

      gaps.push({
        index: i,
        startMs: current.end,
        endMs: next.start,
        durationMs: gapMs,
        contextBefore: contextBeforeWords || current.text,
        contextAfter: contextAfterWords || next.text,
        wordBefore: current,
        wordAfter: next,
      });
    }
  }

  return gaps;
}

async function analyzeSilenceWithAI(gaps: SilenceGap[]): Promise<Map<number, SilenceDecision>> {
  const decisions = new Map<number, SilenceDecision>();

  for (let batch = 0; batch < gaps.length; batch += BATCH_SIZE) {
    const batchGaps = gaps.slice(batch, batch + BATCH_SIZE);

    const pauseDescriptions = batchGaps.map((gap, i) => (
      `Pause ${i + 1}:
- Duration: ${gap.durationMs}ms
- Before: "${gap.contextBefore}"
- After: "${gap.contextAfter}"`
    )).join("\n\n");

    const prompt = `You are a professional video editor analyzing speech pauses.
For each pause below, decide if it should be KEPT, SHORTENED, or REMOVED.

Rules:
- KEEP: The pause adds emotional weight, comedic timing, emphasis, dramatic effect, or lets a powerful statement land. Also keep pauses that are natural breath pauses before a new important thought.
- SHORTEN: The pause is slightly too long but has some natural rhythm. Recommend a duration in ms (typically 150-400ms).
- REMOVE: The pause is dead air, a stumble gap, or adds nothing. The speaker just hesitated or lost their train of thought.

IMPORTANT: Favor naturalness. A video with ALL pauses removed sounds robotic. Keep at least 30-40% of pauses to maintain human feel.

${pauseDescriptions}

Return a JSON object with a "decisions" array, one object per pause:
{"decisions": [{ "action": "KEEP" | "SHORTEN" | "REMOVE", "recommendedMs": number_or_null }]}`;

    try {
      const text = await retryWithBackoff(() => chatJSON({
        system: "You are a professional video editor analyzing speech pauses. Return JSON only.",
        user: prompt,
      }));
      const parsed = JSON.parse(text.replace(/[\u2028\u2029]/g, "\n"));

      const decisions_array = Array.isArray(parsed) ? parsed : parsed.decisions || parsed.pauses || [];

      batchGaps.forEach((gap, i) => {
        if (i < decisions_array.length) {
          const d = decisions_array[i];
          decisions.set(gap.index, {
            action: (d.action || "KEEP").toUpperCase() as "KEEP" | "SHORTEN" | "REMOVE",
            recommendedMs: d.recommendedMs || undefined,
          });
        } else {
          decisions.set(gap.index, { action: "KEEP" });
        }
      });
    } catch (error: any) {
      console.error(`[smartTrimmer] AI batch failed, defaulting to KEEP:`, error.message);
      batchGaps.forEach((gap) => {
        decisions.set(gap.index, { action: "KEEP" });
      });
    }
  }

  return decisions;
}

export interface SmartTrimResult {
  clips: SmartClip[];
  stats: {
    totalGaps: number;
    kept: number;
    shortened: number;
    removed: number;
    originalDurationMs: number;
    trimmedDurationMs: number;
  };
}

export async function smartTrimSilence(
  transcript: TranscriptWord[],
  videoSrc: string
): Promise<SmartTrimResult> {
  if (!transcript || transcript.length === 0) {
    return {
      clips: [],
      stats: { totalGaps: 0, kept: 0, shortened: 0, removed: 0, originalDurationMs: 0, trimmedDurationMs: 0 },
    };
  }

  console.log(`[smartTrimmer] Analyzing ${transcript.length} words for silence gaps...`);

  const gaps = detectSilenceGaps(transcript);
  console.log(`[smartTrimmer] Found ${gaps.length} silence gaps (>=${MIN_GAP_MS}ms)`);

  if (gaps.length === 0) {
    const startMs = Math.max(0, transcript[0].start - BUFFER_MS);
    const endMs = transcript[transcript.length - 1].end + BUFFER_MS;
    return {
      clips: [{
        id: "clip_0",
        words: transcript,
        trimStartMs: startMs,
        trimEndMs: endMs,
        gapAfterMs: 0,
        crossfadeFrames: 0,
        audioFadeMs: 0,
      }],
      stats: {
        totalGaps: 0, kept: 0, shortened: 0, removed: 0,
        originalDurationMs: endMs - startMs,
        trimmedDurationMs: endMs - startMs,
      },
    };
  }

  const decisions = await analyzeSilenceWithAI(gaps);

  let kept = 0, shortened = 0, removed = 0;
  const clips: SmartClip[] = [];
  let currentWords: TranscriptWord[] = [];
  let clipStartMs = Math.max(0, transcript[0].start - BUFFER_MS);
  let clipIndex = 0;
  let totalTrimmedMs = 0;

  const gapByIndex = new Map(gaps.map((g) => [g.index, g]));

  for (let i = 0; i < transcript.length; i++) {
    currentWords.push(transcript[i]);

    const gap = gapByIndex.get(i);
    if (!gap && i < transcript.length - 1) continue;

    const decision = gap ? (decisions.get(gap.index) || { action: "KEEP" }) : null;

    if (!decision || decision.action === "KEEP") {
      if (gap) kept++;
      if (i === transcript.length - 1 || !gap) continue;
      continue;
    }

    if (decision.action === "REMOVE") {
      removed++;

      const clipEndMs = currentWords[currentWords.length - 1].end + BUFFER_MS;

      clips.push({
        id: `clip_${clipIndex++}`,
        words: [...currentWords],
        trimStartMs: clipStartMs,
        trimEndMs: clipEndMs,
        gapAfterMs: 0,
        crossfadeFrames: 4,
        audioFadeMs: 120,
      });

      totalTrimmedMs += gap.durationMs;
      currentWords = [];
      clipStartMs = transcript[i + 1]?.start - BUFFER_MS || clipEndMs;
      clipStartMs = Math.max(0, clipStartMs);
    } else if (decision.action === "SHORTEN") {
      shortened++;

      const targetMs = decision.recommendedMs || Math.min(300, gap.durationMs * 0.5);
      const trimAmount = gap.durationMs - targetMs;
      totalTrimmedMs += trimAmount;

      const clipEndMs = currentWords[currentWords.length - 1].end + BUFFER_MS + targetMs;

      clips.push({
        id: `clip_${clipIndex++}`,
        words: [...currentWords],
        trimStartMs: clipStartMs,
        trimEndMs: clipEndMs,
        gapAfterMs: targetMs,
        crossfadeFrames: 3,
        audioFadeMs: 100,
      });

      currentWords = [];
      clipStartMs = transcript[i + 1]?.start - BUFFER_MS || clipEndMs;
      clipStartMs = Math.max(0, clipStartMs);
    }
  }

  if (currentWords.length > 0) {
    const clipEndMs = currentWords[currentWords.length - 1].end + BUFFER_MS;
    clips.push({
      id: `clip_${clipIndex++}`,
      words: [...currentWords],
      trimStartMs: clipStartMs,
      trimEndMs: clipEndMs,
      gapAfterMs: 0,
      crossfadeFrames: 0,
      audioFadeMs: 0,
    });
  }

  const originalDurationMs = transcript[transcript.length - 1].end - transcript[0].start;

  console.log(`[smartTrimmer] Results: ${kept} kept, ${shortened} shortened, ${removed} removed`);
  console.log(`[smartTrimmer] Trimmed ${(totalTrimmedMs / 1000).toFixed(1)}s of silence`);

  return {
    clips,
    stats: {
      totalGaps: gaps.length,
      kept,
      shortened,
      removed,
      originalDurationMs,
      trimmedDurationMs: originalDurationMs - totalTrimmedMs,
    },
  };
}

export function smartClipsToEDLClips(
  smartClips: SmartClip[],
  videoSrc: string,
  cameraMoves?: any[]
) {
  return smartClips.map((sc) => {
    const trimStartFrame = Math.round((sc.trimStartMs / 1000) * FPS);
    const durationMs = sc.trimEndMs - sc.trimStartMs;
    const durationInFrames = Math.max(1, Math.round((durationMs / 1000) * FPS));

    const words = sc.words
      .filter((w) => w.end > sc.trimStartMs && w.start < sc.trimEndMs)
      .map((w) => {
        const localStartMs = Math.max(0, w.start - sc.trimStartMs);
        const localEndMs = Math.min(durationMs, w.end - sc.trimStartMs);
        const localStartFrame = Math.max(0, Math.round((localStartMs / 1000) * FPS));
        const localEndFrame = Math.min(durationInFrames, Math.round((localEndMs / 1000) * FPS));

        return {
          text: w.text,
          startMs: localStartMs,
          endMs: localEndMs,
          startFrame: localStartFrame,
          endFrame: Math.max(localStartFrame + 1, localEndFrame),
        };
      });

    return {
      id: sc.id,
      src: videoSrc,
      trimStartFrame,
      durationInFrames,
      zoomTarget: 1.0,
      words,
      cameraMoves: cameraMoves || [],
      popups: [],
      crossfadeFrames: sc.crossfadeFrames,
      audioFadeMs: sc.audioFadeMs,
    };
  });
}
