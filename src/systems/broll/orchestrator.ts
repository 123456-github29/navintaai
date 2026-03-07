import type { BrollFillRequest, BrollFillResponse, BrollCandidate, BrollSlot } from "./contracts";
import { BrollFillRequestSchema } from "./contracts";
import type { BrollProvider, ProviderClip } from "./providers/types";
import { PexelsProvider, selectBestDownloadUrl } from "./providers/pexels";
import { scoreCandidate } from "./scoring";
import { computeSuggestedTrim } from "./trim";

interface CacheEntry {
  clips: ProviderClip[];
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedClips(query: string): ProviderClip[] | null {
  const entry = queryCache.get(query);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(query);
    return null;
  }
  return entry.clips;
}

function setCachedClips(query: string, clips: ProviderClip[]): void {
  queryCache.set(query, { clips, expiresAt: Date.now() + CACHE_TTL_MS });
}

const providers: Record<string, BrollProvider> = {
  pexels: new PexelsProvider(),
};

export async function fillBrollSlots(
  request: BrollFillRequest
): Promise<BrollFillResponse> {
  const parsed = BrollFillRequestSchema.parse(request);
  const { slots, topK = 5, sourcePriority = ["pexels"], globalRules } = parsed;

  const minGap = globalRules?.minGapMsBetweenSameAsset ?? 60000;
  const maxReuse = globalRules?.maxReusePerVideo ?? 1;

  const usedAssets = new Map<string, { count: number; slotStartMs: number[] }>();

  let totalProviderCalls = 0;
  let totalCacheHits = 0;

  const slotResults: BrollFillResponse["slotResults"] = [];

  for (const slot of slots) {
    const query = buildQuery(slot);
    const providerName = sourcePriority[0] || "pexels";
    const provider = providers[providerName];
    if (!provider) {
      slotResults.push({ slotId: slot.slotId, candidates: [] });
      continue;
    }

    let clips: ProviderClip[];
    const cached = getCachedClips(query);
    if (cached) {
      clips = cached;
      totalCacheHits++;
    } else {
      clips = await provider.searchVideos(query, 15);
      setCachedClips(query, clips);
      totalProviderCalls++;
    }

    const minRes = slot.styleConstraints.minResolution || { width: 1920, height: 1080 };

    const scored: BrollCandidate[] = clips.map((clip) => {
      const { fit, overallScore, reason } = scoreCandidate(clip, slot);

      const previewUrl =
        clip.videoPictures?.[0]?.picture ||
        selectBestDownloadUrl(clip.videoFiles, 640, 360) ||
        clip.url;

      const downloadUrl = selectBestDownloadUrl(
        clip.videoFiles,
        minRes.width,
        minRes.height
      );

      const trim = computeSuggestedTrim(clip.durationMs, slot.durationTargetMs);

      return {
        assetId: `pexels:${clip.id}`,
        source: "pexels" as const,
        license: "stock" as const,
        previewUrl,
        downloadUrl,
        durationMs: clip.durationMs,
        width: clip.width,
        height: clip.height,
        tags: clip.tags,
        suggestedTrim: trim,
        fit,
        overallScore,
        reason,
      };
    });

    scored.sort((a, b) => b.overallScore - a.overallScore);

    const filtered = applyNoveltyRules(
      scored,
      slot,
      usedAssets,
      minGap,
      maxReuse,
      topK
    );

    for (const c of filtered) {
      const entry = usedAssets.get(c.assetId) || { count: 0, slotStartMs: [] };
      entry.count++;
      entry.slotStartMs.push(slot.startMs);
      usedAssets.set(c.assetId, entry);
    }

    slotResults.push({ slotId: slot.slotId, candidates: filtered });
  }

  return {
    slotResults,
    stats: {
      slotsProcessed: slots.length,
      providerCalls: totalProviderCalls,
      cacheHits: totalCacheHits,
    },
  };
}

function buildQuery(slot: BrollSlot): string {
  if (slot.intent.query) return slot.intent.query;

  const parts = [
    ...slot.intent.entities,
    ...slot.intent.actions,
    ...slot.intent.keywords,
  ];
  return parts.join(" ").trim() || "stock footage";
}

function applyNoveltyRules(
  candidates: BrollCandidate[],
  slot: BrollSlot,
  usedAssets: Map<string, { count: number; slotStartMs: number[] }>,
  minGapMs: number,
  maxReuse: number,
  topK: number
): BrollCandidate[] {
  const result: BrollCandidate[] = [];
  const qualityGate = 0.6;

  for (const c of candidates) {
    if (result.length >= topK) break;

    const usage = usedAssets.get(c.assetId);
    if (usage) {
      if (usage.count >= maxReuse) continue;

      const tooClose = usage.slotStartMs.some(
        (ms) => Math.abs(slot.startMs - ms) < minGapMs
      );
      if (tooClose) continue;
    }

    if (c.overallScore < qualityGate) {
      result.push({ ...c, reason: "low confidence; " + c.reason });
    } else {
      result.push(c);
    }
  }

  if (result.length === 0 && candidates.length > 0) {
    const best = candidates[0];
    result.push({
      ...best,
      reason: best.overallScore < qualityGate
        ? "low confidence; best available"
        : best.reason,
    });
  }

  return result;
}
