import { retryWithBackoff } from "./geminiRetry";
import { chatJSON } from "./openaiClient";
import type { CameraMove } from "../../src/remotion/types/edl";

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

interface EmphasisMoment {
  startTime: number;
  endTime: number;
  intensity: "low" | "medium" | "high";
  reason?: string;
}

const ZOOM_LEVELS = {
  low: { from: 1.0, to: 1.08 },
  medium: { from: 1.0, to: 1.15 },
  high: { from: 1.0, to: 1.22 },
};

const RAMP_DURATION = {
  low: { in: 0.8, out: 0.6 },
  medium: { in: 1.0, out: 0.8 },
  high: { in: 1.2, out: 1.0 },
};

export async function analyzeEmphasisMoments(
  transcript: TranscriptWord[]
): Promise<EmphasisMoment[]> {
  if (!transcript || transcript.length === 0) return [];

  const fullText = transcript.map((w) => w.text).join(" ");
  const totalDurationSec = (transcript[transcript.length - 1].end - transcript[0].start) / 1000;

  const timestampedText = buildTimestampedText(transcript);

  const prompt = `You are a professional video editor analyzing a spoken transcript to decide where cinematic camera zooms should happen.

The transcript is ${totalDurationSec.toFixed(1)} seconds long.

Here is the timestamped transcript:
${timestampedText}

Identify the KEY MOMENTS that deserve a cinematic zoom. Look for:
1. **Hooks/Opening statements** (first 3-5 seconds) — usually HIGH intensity
2. **Emotional peaks** — strong feelings, vulnerability, passion
3. **Punchlines or key insights** — the "aha" moment
4. **Important statements** — data points, claims, revelations
5. **Emphasis words** — when the speaker stresses something important
6. **Transitions** — when shifting to a new important topic

Rules:
- Don't over-zoom. Aim for 3-6 zoom moments per 30 seconds of content.
- Space zooms at least 2 seconds apart.
- Most zooms should be "low" or "medium". Use "high" only 1-2 times maximum for the most impactful moments.
- The first 3 seconds should almost always have a HIGH zoom for the hook.
- Never zoom during filler words or mundane transitions.

Return a JSON object with a "moments" array:
{"moments": [
  {
    "startTime": <start time in milliseconds>,
    "endTime": <end time in milliseconds>,
    "intensity": "low" | "medium" | "high",
    "reason": "brief explanation"
  }
]}

Return {"moments": []} if the transcript is too short (<3 seconds) for meaningful zooms.`;

  try {
    console.log(`[smartZoom] Analyzing ${totalDurationSec.toFixed(1)}s transcript for emphasis moments...`);
    const text = await retryWithBackoff(() => chatJSON({
      system: "You are a professional video editor analyzing transcripts for cinematic zoom placement. Return JSON only.",
      user: prompt,
    }));
    const parsed = JSON.parse(text.replace(/[\u2028\u2029]/g, "\n"));

    const moments: EmphasisMoment[] = (Array.isArray(parsed) ? parsed : parsed.moments || [])
      .filter((m: any) => m.startTime != null && m.endTime != null && m.intensity)
      .map((m: any) => ({
        startTime: Number(m.startTime),
        endTime: Number(m.endTime),
        intensity: (m.intensity || "low").toLowerCase() as "low" | "medium" | "high",
        reason: m.reason || "",
      }));

    console.log(`[smartZoom] Found ${moments.length} emphasis moments`);
    return moments;
  } catch (error: any) {
    console.error(`[smartZoom] AI analysis failed:`, error.message);
    return generateFallbackEmphasis(transcript);
  }
}

function buildTimestampedText(transcript: TranscriptWord[]): string {
  const lines: string[] = [];
  let currentLine: string[] = [];
  let lineStartMs = transcript[0]?.start || 0;

  for (let i = 0; i < transcript.length; i++) {
    currentLine.push(transcript[i].text);

    if (currentLine.length >= 8 || i === transcript.length - 1) {
      const lineEndMs = transcript[i].end;
      lines.push(`[${(lineStartMs / 1000).toFixed(1)}s - ${(lineEndMs / 1000).toFixed(1)}s] ${currentLine.join(" ")}`);
      currentLine = [];
      if (i + 1 < transcript.length) {
        lineStartMs = transcript[i + 1].start;
      }
    }
  }

  return lines.join("\n");
}

function generateFallbackEmphasis(transcript: TranscriptWord[]): EmphasisMoment[] {
  if (transcript.length < 5) return [];

  const moments: EmphasisMoment[] = [];
  const totalMs = transcript[transcript.length - 1].end - transcript[0].start;

  moments.push({
    startTime: transcript[0].start,
    endTime: Math.min(transcript[0].start + 2000, transcript[Math.min(5, transcript.length - 1)].end),
    intensity: "high",
    reason: "Hook/opening",
  });

  const midIndex = Math.floor(transcript.length / 2);
  if (totalMs > 10000) {
    moments.push({
      startTime: transcript[midIndex].start,
      endTime: transcript[Math.min(midIndex + 3, transcript.length - 1)].end,
      intensity: "medium",
      reason: "Mid-point emphasis",
    });
  }

  if (totalMs > 15000) {
    const lastIdx = transcript.length - 1;
    const nearEndIdx = Math.max(0, lastIdx - 4);
    moments.push({
      startTime: transcript[nearEndIdx].start,
      endTime: transcript[lastIdx].end,
      intensity: "medium",
      reason: "Closing emphasis",
    });
  }

  return moments;
}

function deterministicRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function emphasisToCameraMoves(
  moments: EmphasisMoment[],
  clipTrimStartMs: number,
  clipDurationMs: number
): CameraMove[] {
  const moves: CameraMove[] = [];
  const clipEndMs = clipTrimStartMs + clipDurationMs;
  const clipDurationSec = clipDurationMs / 1000;

  for (let mi = 0; mi < moments.length; mi++) {
    const moment = moments[mi];
    if (moment.endTime < clipTrimStartMs || moment.startTime > clipEndMs) continue;

    const zoom = ZOOM_LEVELS[moment.intensity];
    const ramp = RAMP_DURATION[moment.intensity];

    const momentMidMs = Math.max(clipTrimStartMs, Math.min(clipEndMs, (moment.startTime + moment.endTime) / 2));
    const localMidSec = (momentMidMs - clipTrimStartMs) / 1000;

    const rampInStartSec = Math.max(0, localMidSec - ramp.in * 0.5);
    const rampInEndSec = localMidSec;
    const rampOutStartSec = localMidSec;
    const rampOutEndSec = Math.min(clipDurationSec, localMidSec + ramp.out);

    const microDriftX = (deterministicRandom(mi * 7 + 1) - 0.5) * 10;
    const microDriftY = (deterministicRandom(mi * 7 + 3) - 0.5) * 8;

    moves.push({
      type: "zoom_in",
      startSec: rampInStartSec,
      endSec: rampInEndSec,
      fromScale: zoom.from,
      toScale: zoom.to,
      xOffset: microDriftX,
      yOffset: microDriftY,
    });

    moves.push({
      type: "zoom_out",
      startSec: rampOutStartSec,
      endSec: rampOutEndSec,
      fromScale: zoom.to,
      toScale: zoom.from,
    });
  }

  return moves;
}

export async function generateSmartZooms(
  transcript: TranscriptWord[],
  clips: Array<{ trimStartMs: number; durationMs: number }>
): Promise<CameraMove[][]> {
  const moments = await analyzeEmphasisMoments(transcript);

  return clips.map((clip) =>
    emphasisToCameraMoves(moments, clip.trimStartMs, clip.durationMs)
  );
}
