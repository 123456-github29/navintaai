import type { BrollSlot, FitScores } from "./contracts";
import type { ProviderClip } from "./providers/types";

export function normalizeTokens(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function tokenOverlap(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setB = new Set(tokensB);
  let matches = 0;
  for (let i = 0; i < tokensA.length; i++) {
    if (setB.has(tokensA[i])) matches++;
  }
  return matches / Math.max(tokensA.length, 1);
}

export function computeKeywordScore(
  slot: BrollSlot,
  clip: ProviderClip
): number {
  const queryTokens = normalizeTokens(slot.intent.query);
  const keywordTokens = slot.intent.keywords.flatMap(normalizeTokens);
  const intentSet = new Set([...queryTokens, ...keywordTokens]);
  const intentTokens = Array.from(intentSet);

  let clipTokens: string[];
  if (clip.tags.length > 0) {
    clipTokens = clip.tags.flatMap(normalizeTokens);
  } else {
    clipTokens = normalizeTokens(clip.url);
  }

  return tokenOverlap(intentTokens, clipTokens);
}

export function computeEntityScore(
  slot: BrollSlot,
  clip: ProviderClip
): number {
  if (slot.intent.entities.length === 0) return 0;

  const entityTokens = slot.intent.entities.flatMap(normalizeTokens);
  let clipText: string[];
  if (clip.tags.length > 0) {
    clipText = clip.tags.flatMap(normalizeTokens);
  } else {
    clipText = normalizeTokens(clip.url);
  }

  const setClip = new Set(clipText);
  let found = 0;
  for (const et of entityTokens) {
    if (setClip.has(et)) found++;
  }
  return Math.min(found / Math.max(entityTokens.length, 1), 1);
}

export function computeDurationFit(
  clipDurationMs: number,
  targetMs: number
): number {
  if (clipDurationMs <= 0 || targetMs <= 0) return 0;

  if (clipDurationMs >= targetMs) {
    const ratio = targetMs / clipDurationMs;
    if (ratio >= 0.3) return 1;
    return Math.max(ratio / 0.3, 0.2);
  }

  return clipDurationMs / targetMs;
}

export function computeCropFit(
  clip: ProviderClip,
  slot: BrollSlot
): number {
  const cropMode = slot.styleConstraints.cropMode;
  if (cropMode === "any") return 0.7;

  const aspect = clip.width / clip.height;
  const target916 = 9 / 16;
  const diff = Math.abs(aspect - target916);

  if (diff < 0.05) return 1;

  if (
    (clip.width >= 1080 && clip.height >= 1920) ||
    (clip.width >= 1920 && clip.height >= 1080)
  ) {
    return 0.8;
  }

  if (clip.width >= 720 && clip.height >= 1280) return 0.6;

  return Math.max(0.2, 1 - diff * 2);
}

const DYNAMIC_TAGS = new Set([
  "action", "sports", "movement", "fast", "running", "motion",
  "active", "energy", "speed", "race", "competition",
]);
const CINEMATIC_TAGS = new Set([
  "cinematic", "sunset", "moody", "dramatic", "film",
  "slow", "atmospheric", "landscape", "golden",
]);

export function computeStyleFit(
  clip: ProviderClip,
  slot: BrollSlot
): number {
  const constraints = slot.styleConstraints;
  let score = 0.5;
  let factors = 0;

  if (clip.tags.length > 0) {
    const clipTagArr = clip.tags.flatMap(normalizeTokens);
    const clipTagSet = new Set(clipTagArr);

    if (constraints.avoidTags && constraints.avoidTags.length > 0) {
      const avoidTokens = constraints.avoidTags.flatMap(normalizeTokens);
      const hasAvoid = avoidTokens.some((t) => clipTagSet.has(t));
      if (hasAvoid) {
        score -= 0.3;
        factors++;
      }
    }

    if (constraints.preferTags && constraints.preferTags.length > 0) {
      const preferTokens = constraints.preferTags.flatMap(normalizeTokens);
      const matchCount = preferTokens.filter((t) => clipTagSet.has(t)).length;
      const preferScore = matchCount / Math.max(preferTokens.length, 1);
      score += preferScore * 0.3;
      factors++;
    }

    const energy = slot.intent.visualEnergy;
    if (energy === "dynamic") {
      const dynMatch = clipTagArr.filter((t) => DYNAMIC_TAGS.has(t)).length;
      score += Math.min(dynMatch * 0.1, 0.2);
      factors++;
    } else if (energy === "cinematic") {
      const cinMatch = clipTagArr.filter((t) => CINEMATIC_TAGS.has(t)).length;
      score += Math.min(cinMatch * 0.1, 0.2);
      factors++;
    }
  }

  if (constraints.cameraStyle === "any" || !constraints.cameraStyle) {
    // no adjustment
  }

  return Math.max(0, Math.min(1, score));
}

export function scoreCandidate(
  clip: ProviderClip,
  slot: BrollSlot
): { fit: FitScores; overallScore: number; reason: string } {
  const semanticScore = 0.55;
  const keywordScore = computeKeywordScore(slot, clip);
  const entityScore = computeEntityScore(slot, clip);
  const durationFit = computeDurationFit(clip.durationMs, slot.durationTargetMs);
  const cropFit = computeCropFit(clip, slot);
  const styleFit = computeStyleFit(clip, slot);

  let overall =
    0.35 * semanticScore +
    0.2 * keywordScore +
    0.2 * durationFit +
    0.15 * cropFit +
    0.1 * styleFit;

  overall *= 1 + 0.25 * entityScore;
  overall = Math.min(overall, 1);

  const fit: FitScores = {
    semanticScore,
    keywordScore,
    entityScore,
    durationFit,
    cropFit,
    styleFit,
  };

  const parts: string[] = [];
  if (keywordScore > 0.5) parts.push("strong keyword match");
  if (durationFit > 0.8) parts.push("good duration fit");
  if (cropFit > 0.7) parts.push("crop compatible");
  if (entityScore > 0.3) parts.push("entity match");
  if (overall < 0.6) parts.push("low confidence");

  const reason = parts.length > 0 ? parts.join("; ") : "baseline match";

  return { fit, overallScore: Math.round(overall * 1000) / 1000, reason };
}
