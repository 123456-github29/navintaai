import { z } from "zod";

export const BrollIntentSchema = z.object({
  entities: z.array(z.string()),
  actions: z.array(z.string()),
  keywords: z.array(z.string()),
  visualEnergy: z.enum(["static", "dynamic", "cinematic"]),
  query: z.string().min(1),
});
export type BrollIntent = z.infer<typeof BrollIntentSchema>;

export const StyleConstraintsSchema = z.object({
  cropMode: z.enum(["9:16-safe", "any"]).default("any"),
  matchColorMood: z.enum(["warm", "cool", "neutral"]).optional(),
  cameraStyle: z.enum(["stable", "handheld", "action", "any"]).optional(),
  avoidTags: z.array(z.string()).optional(),
  preferTags: z.array(z.string()).optional(),
  minResolution: z
    .object({
      width: z.number().int().nonnegative(),
      height: z.number().int().nonnegative(),
    })
    .optional(),
});
export type StyleConstraints = z.infer<typeof StyleConstraintsSchema>;

export const BrollSlotSchema = z.object({
  slotId: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  durationTargetMs: z.number().int().positive(),
  purpose: z.enum([
    "example",
    "explain",
    "contrast",
    "mood",
    "transition",
    "emphasis",
  ]),
  intent: BrollIntentSchema,
  styleConstraints: StyleConstraintsSchema.optional().default({ cropMode: "any" }),
  priority: z.number().min(0).max(1),
}).refine((s) => s.endMs >= s.startMs, {
  message: "endMs must be >= startMs",
});
export type BrollSlot = z.infer<typeof BrollSlotSchema>;

export const FitScoresSchema = z.object({
  semanticScore: z.number().min(0).max(1),
  keywordScore: z.number().min(0).max(1),
  entityScore: z.number().min(0).max(1),
  durationFit: z.number().min(0).max(1),
  cropFit: z.number().min(0).max(1),
  styleFit: z.number().min(0).max(1),
});
export type FitScores = z.infer<typeof FitScoresSchema>;

export const BrollCandidateSchema = z.object({
  assetId: z.string(),
  source: z.literal("pexels"),
  license: z.literal("stock"),
  previewUrl: z.string().url(),
  downloadUrl: z.string().url().optional(),
  durationMs: z.number().int().nonnegative(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  suggestedTrim: z.object({
    inMs: z.number().int().nonnegative(),
    outMs: z.number().int().nonnegative(),
  }),
  fit: FitScoresSchema,
  overallScore: z.number().min(0).max(1),
  reason: z.string(),
});
export type BrollCandidate = z.infer<typeof BrollCandidateSchema>;

export const GlobalRulesSchema = z.object({
  minGapMsBetweenSameAsset: z.number().int().nonnegative().default(60000),
  maxReusePerVideo: z.number().int().positive().default(1),
});
export type GlobalRules = z.infer<typeof GlobalRulesSchema>;

export const BrollFillRequestSchema = z.object({
  slots: z.array(BrollSlotSchema).min(1),
  topK: z.number().int().positive().default(5),
  sourcePriority: z.array(z.literal("pexels")).default(["pexels"]),
  globalRules: GlobalRulesSchema.optional(),
});
export type BrollFillRequest = z.infer<typeof BrollFillRequestSchema>;

export const TranscriptWordSchema = z.object({
  text: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
});
export type TranscriptWord = z.infer<typeof TranscriptWordSchema>;

export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string(),
  words: z.array(TranscriptWordSchema),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const VideoContextSchema = z.object({
  platform: z.enum(["tiktok", "reels", "youtube_shorts", "youtube"]),
  videoType: z.enum([
    "talking_head", "voiceover", "podcast", "tutorial",
    "vlog", "product", "sports", "news", "other",
  ]),
  targetDurationMs: z.number().int().positive().optional(),
  pacing: z.enum(["fast", "medium", "slow"]),
  mood: z.enum([
    "inspirational", "humor", "serious", "educational",
    "hype", "calm", "dramatic",
  ]),
  language: z.string().optional(),
  brandSafety: z.enum(["strict", "normal"]).default("normal"),
});
export type VideoContext = z.infer<typeof VideoContextSchema>;

export const DirectorRulesSchema = z.object({
  maxBrollSlotsPerMinute: z.number().positive().default(4),
  minGapMsBetweenSlots: z.number().int().nonnegative().default(5000),
  maxSlotDurationMs: z.number().int().positive().default(4000),
  minSlotDurationMs: z.number().int().positive().default(1000),
  preferBrollOn: z.enum(["examples", "claims", "lists", "story_beats", "all"]).default("all"),
  avoidBrollOn: z.array(z.string()).optional(),
});
export type DirectorRules = z.infer<typeof DirectorRulesSchema>;

export const DirectorRequestSchema = z.object({
  transcriptSegments: z.array(TranscriptSegmentSchema).min(1),
  videoContext: VideoContextSchema,
  directorRules: DirectorRulesSchema.optional(),
});
export type DirectorRequest = z.infer<typeof DirectorRequestSchema>;

export const DirectorResponseSchema = z.object({
  slots: z.array(BrollSlotSchema),
  meta: z.object({
    totalDurationMs: z.number().int().nonnegative(),
    slotsGenerated: z.number().int().nonnegative(),
    model: z.string(),
  }),
});
export type DirectorResponse = z.infer<typeof DirectorResponseSchema>;

export const BrollFillResponseSchema = z.object({
  slotResults: z.array(
    z.object({
      slotId: z.string(),
      candidates: z.array(BrollCandidateSchema),
    })
  ),
  stats: z.object({
    slotsProcessed: z.number().int().nonnegative(),
    providerCalls: z.number().int().nonnegative(),
    cacheHits: z.number().int().nonnegative(),
  }),
});
export type BrollFillResponse = z.infer<typeof BrollFillResponseSchema>;
