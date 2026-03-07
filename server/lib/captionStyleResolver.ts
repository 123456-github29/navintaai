import { readFileSync } from "fs";
import { join } from "path";

const STYLE_ID_TO_FAMILY: Record<string, string> = {
  default: "tiktok_classic_pop",
  kinetic_bounce: "kinetic_bounce",
  cinematic_plate: "cinematic_plate",
  impact_flash: "tiktok_classic_pop",
  karaoke_glow: "neon_glow",
  minimal_fade: "subtitle_bar",
  bold_stack: "tiktok_classic_pop",
  neon_outline: "neon_glow",

  "tiktok-classic-pop-clean-white": "tiktok_classic_pop",
  "kinetic-bounce-pop-orange": "kinetic_bounce",
  "per-word-pill-midnight": "per_word_pill",
  "subtitle-bar-classic-white": "subtitle_bar",
  "cinematic-plate-gold": "cinematic_plate",
  "neon-glow-cyan": "neon_glow",
  "marker-highlight-yellow": "marker_highlight",
  "glass-pill-frost": "glass_pill",
  "typewriter-cursor-green": "typewriter_cursor",
};

function loadAllStyles(): any[] {
  const stylesRaw = readFileSync(
    join(process.cwd(), "src/captions/styles/generated.json"),
    "utf-8"
  );
  return JSON.parse(stylesRaw);
}

export function resolveCaptionStyleSpec(styleId?: string): any | undefined {
  if (!styleId) return undefined;

  const allStyles = loadAllStyles();

  const exact = allStyles.find((s: any) => s.id === styleId);
  if (exact) return exact;

  const family = STYLE_ID_TO_FAMILY[styleId] || styleId;
  const familyMatch = allStyles.find((s: any) => s.styleFamily === family);
  if (familyMatch) return familyMatch;

  return allStyles[0];
}
