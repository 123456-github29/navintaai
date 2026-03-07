export type HookStyle = "curiosity_gap" | "contrarian" | "fast_value" | "story" | "proof";

export const HOOK_STYLES: Record<HookStyle, { label: string; example: string }> = {
  curiosity_gap: { label: "Curiosity Gap", example: "Nobody tells you this..." },
  contrarian: { label: "Contrarian", example: "Stop doing X... do this instead" },
  fast_value: { label: "Fast Value", example: "In 20 seconds, here's..." },
  story: { label: "Story", example: "I almost ruined X until..." },
  proof: { label: "Proof", example: "I got X result in Y days..." },
};

export interface ScriptBeat {
  type: "hook" | "context" | "insight" | "example" | "proof" | "pattern_interrupt" | "payoff" | "cta";
  text: string;
  onScreen?: string;
  brollHint?: string;
  durationSec: number;
}

export interface ScriptStructure {
  title: string;
  hook: string;
  hookVariations: string[];
  beats: ScriptBeat[];
  payoff: string;
  cta: string;
  captionLines: string[];
  suggestedShots: Array<{
    shotId: string;
    shotType: string;
    whatToShow: string;
    why: string;
  }>;
  pacing: {
    avgSentenceWords: number;
    energyCurve: string;
  };
  retentionToolsUsed: string[];
}

export interface ScriptScoreBreakdown {
  hookStrength: number;
  claritySimpplicity: number;
  patternInterrupts: number;
  payoffClarity: number;
  specificity: number;
  humanTone: number;
  ctaRelevance: number;
  total: number;
  feedback: string[];
}

export const DURATION_WORD_RANGES: Record<number, { min: number; max: number }> = {
  15: { min: 45, max: 75 },
  30: { min: 90, max: 140 },
  45: { min: 140, max: 200 },
  60: { min: 200, max: 260 },
  90: { min: 350, max: 450 },
};

export function getWordRangeForDuration(seconds: number): { min: number; max: number } {
  if (seconds <= 15) return DURATION_WORD_RANGES[15];
  if (seconds <= 30) return DURATION_WORD_RANGES[30];
  if (seconds <= 45) return DURATION_WORD_RANGES[45];
  if (seconds <= 60) return DURATION_WORD_RANGES[60];
  return DURATION_WORD_RANGES[90];
}
