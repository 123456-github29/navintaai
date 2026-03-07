export type StyleFamily =
  | "tiktok_classic_pop"
  | "subtitle_bar"
  | "typewriter_cursor"
  | "per_word_pill"
  | "glass_pill"
  | "marker_highlight"
  | "neon_glow"
  | "cinematic_plate"
  | "kinetic_bounce";

export type HighlightMode = "none" | "color" | "scale" | "pill" | "scale+color" | "pill+scale";
export type MotionType = "none" | "fade-up" | "fade-in" | "pop";
export type TextAlign = "center" | "left" | "right";
export type TextTransform = "none" | "uppercase" | "lowercase";
export type Position = "bottom" | "middle" | "top";

export interface CaptionStyleSpec {
  id: string;
  name: string;
  category: string;
  styleFamily: StyleFamily;

  typography: {
    fontFamily: string;
    fontWeight: number;
    fontSizePx: number;
    letterSpacingPx: number;
    lineHeight: number;
    textTransform: TextTransform;
  };

  layout: {
    position: Position;
    safeMarginPx: number;
    maxLines: number;
    maxWidthPct: number;
    align: TextAlign;
    wordSpacingPx: number;
  };

  fill: {
    color: string;
    opacity: number;
  };

  stroke: {
    enabled: boolean;
    color: string;
    widthPx: number;
    opacity: number;
  };

  shadow: {
    enabled: boolean;
    color: string;
    blurPx: number;
    offsetXPx: number;
    offsetYPx: number;
    opacity: number;
  };

  plate: {
    enabled: boolean;
    color: string;
    opacity: number;
    paddingPx: number;
    radiusPx: number;
    blurPx: number;
  };

  highlight: {
    mode: HighlightMode;
    activeColor: string;
    inactiveOpacity: number;
    scale: number;
    pillColor: string;
    pillOpacity: number;
    pillPaddingPx: number;
    pillRadiusPx: number;
  };

  motion: {
    lineIn: MotionType;
    lineInMs: number;
    wordPop: boolean;
    staggerMs: number;
    typewriterCursor: boolean;
    cursorBlinkMs: number;
    bounceScale: number;
    glowPulse: boolean;
  };
}

export const DEFAULT_SPEC: CaptionStyleSpec = {
  id: "default",
  name: "Clean White",
  category: "minimal",
  styleFamily: "tiktok_classic_pop",
  typography: {
    fontFamily: "Inter",
    fontWeight: 700,
    fontSizePx: 80,
    letterSpacingPx: -0.5,
    lineHeight: 1.2,
    textTransform: "none",
  },
  layout: {
    position: "bottom",
    safeMarginPx: 80,
    maxLines: 2,
    maxWidthPct: 90,
    align: "center",
    wordSpacingPx: 6,
  },
  fill: { color: "#FFFFFF", opacity: 1 },
  stroke: { enabled: true, color: "#000000", widthPx: 3, opacity: 1 },
  shadow: { enabled: true, color: "rgba(0,0,0,0.7)", blurPx: 8, offsetXPx: 0, offsetYPx: 2, opacity: 0.7 },
  plate: { enabled: false, color: "rgba(0,0,0,0.5)", opacity: 0.25, paddingPx: 12, radiusPx: 12, blurPx: 0 },
  highlight: { mode: "color", activeColor: "#FACC15", inactiveOpacity: 0.4, scale: 1.15, pillColor: "rgba(0,0,0,0.5)", pillOpacity: 0.25, pillPaddingPx: 6, pillRadiusPx: 8 },
  motion: { lineIn: "fade-up", lineInMs: 200, wordPop: false, staggerMs: 0, typewriterCursor: false, cursorBlinkMs: 500, bounceScale: 0, glowPulse: false },
};
