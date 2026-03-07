import { z } from "zod";

const FONT_WHITELIST = [
  "Inter",
  "Montserrat",
  "Poppins",
  "Anton",
  "Bebas Neue",
  "Playfair Display",
  "Georgia",
  "Oswald",
  "Raleway",
  "Roboto Condensed",
] as const;

export const StyleFamilyEnum = z.enum([
  "tiktok_classic_pop",
  "subtitle_bar",
  "typewriter_cursor",
  "per_word_pill",
  "glass_pill",
  "marker_highlight",
  "neon_glow",
  "cinematic_plate",
  "kinetic_bounce",
]);

export const HighlightModeEnum = z.enum([
  "none",
  "color",
  "scale",
  "pill",
  "scale+color",
  "pill+scale",
]);

export const MotionTypeEnum = z.enum(["none", "fade-up", "fade-in", "pop"]);
export const TextAlignEnum = z.enum(["center", "left", "right"]);
export const TextTransformEnum = z.enum(["none", "uppercase", "lowercase"]);
export const PositionEnum = z.enum(["bottom", "middle", "top"]);

export const CaptionStyleSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  styleFamily: StyleFamilyEnum.default("tiktok_classic_pop"),

  typography: z.object({
    fontFamily: z.string().default("Inter"),
    fontWeight: z.number().int().min(100).max(900).default(700),
    fontSizePx: z.number().min(24).max(120).default(80),
    letterSpacingPx: z.number().min(-3).max(8).default(0),
    lineHeight: z.number().min(0.8).max(2).default(1.2),
    textTransform: TextTransformEnum.default("none"),
  }),

  layout: z.object({
    position: PositionEnum.default("bottom"),
    safeMarginPx: z.number().min(0).max(200).default(80),
    maxLines: z.number().int().min(1).max(4).default(2),
    maxWidthPct: z.number().min(50).max(100).default(90),
    align: TextAlignEnum.default("center"),
    wordSpacingPx: z.number().min(0).max(20).default(6),
  }),

  fill: z.object({
    color: z.string().default("#FFFFFF"),
    opacity: z.number().min(0).max(1).default(1),
  }),

  stroke: z.object({
    enabled: z.boolean().default(false),
    color: z.string().default("#000000"),
    widthPx: z.number().min(0).max(8).default(0),
    opacity: z.number().min(0).max(1).default(1),
  }),

  shadow: z.object({
    enabled: z.boolean().default(true),
    color: z.string().default("rgba(0,0,0,0.7)"),
    blurPx: z.number().min(0).max(40).default(8),
    offsetXPx: z.number().min(-20).max(20).default(0),
    offsetYPx: z.number().min(-20).max(20).default(2),
    opacity: z.number().min(0).max(1).default(0.7),
  }),

  plate: z.object({
    enabled: z.boolean().default(false),
    color: z.string().default("rgba(0,0,0,0.5)"),
    opacity: z.number().min(0).max(1).default(0.25),
    paddingPx: z.number().min(0).max(40).default(12),
    radiusPx: z.number().min(0).max(40).default(12),
    blurPx: z.number().min(0).max(30).default(0),
  }),

  highlight: z.object({
    mode: HighlightModeEnum.default("color"),
    activeColor: z.string().default("#FACC15"),
    inactiveOpacity: z.number().min(0).max(1).default(0.4),
    scale: z.number().min(1).max(1.5).default(1.15),
    pillColor: z.string().default("rgba(0,0,0,0.5)"),
    pillOpacity: z.number().min(0).max(1).default(0.25),
    pillPaddingPx: z.number().min(0).max(20).default(6),
    pillRadiusPx: z.number().min(0).max(24).default(8),
  }),

  motion: z.object({
    lineIn: MotionTypeEnum.default("fade-up"),
    lineInMs: z.number().min(0).max(600).default(200),
    wordPop: z.boolean().default(false),
    staggerMs: z.number().min(0).max(200).default(0),
    typewriterCursor: z.boolean().default(false),
    cursorBlinkMs: z.number().min(100).max(1000).default(500),
    bounceScale: z.number().min(0).max(1).default(0),
    glowPulse: z.boolean().default(false),
  }),
});

export type CaptionStyleSpec = z.infer<typeof CaptionStyleSpecSchema>;

export function clampSpec(spec: Partial<CaptionStyleSpec>): CaptionStyleSpec {
  const result = CaptionStyleSpecSchema.safeParse(spec);
  if (result.success) return result.data;

  const fallback: CaptionStyleSpec = {
    ...DEFAULT_SPEC,
    ...spec,
    id: spec.id ?? DEFAULT_SPEC.id,
    name: spec.name ?? DEFAULT_SPEC.name,
    category: spec.category ?? DEFAULT_SPEC.category,
    styleFamily: spec.styleFamily ?? DEFAULT_SPEC.styleFamily,
    typography: { ...DEFAULT_SPEC.typography, ...(spec.typography ?? {}) },
    layout: { ...DEFAULT_SPEC.layout, ...(spec.layout ?? {}) },
    fill: { ...DEFAULT_SPEC.fill, ...(spec.fill ?? {}) },
    stroke: { ...DEFAULT_SPEC.stroke, ...(spec.stroke ?? {}) },
    shadow: { ...DEFAULT_SPEC.shadow, ...(spec.shadow ?? {}) },
    plate: { ...DEFAULT_SPEC.plate, ...(spec.plate ?? {}) },
    highlight: { ...DEFAULT_SPEC.highlight, ...(spec.highlight ?? {}) },
    motion: { ...DEFAULT_SPEC.motion, ...(spec.motion ?? {}) },
  };
  return CaptionStyleSpecSchema.parse(fallback);
}

export const DEFAULT_SPEC: CaptionStyleSpec = {
  id: "default",
  name: "Viral Pop",
  category: "bold",
  styleFamily: "tiktok_classic_pop",
  typography: {
    fontFamily: "Montserrat",
    fontWeight: 900,
    fontSizePx: 76,
    letterSpacingPx: 0.5,
    lineHeight: 1.15,
    textTransform: "uppercase",
  },
  layout: {
    position: "bottom",
    safeMarginPx: 90,
    maxLines: 2,
    maxWidthPct: 88,
    align: "center",
    wordSpacingPx: 8,
  },
  fill: {
    color: "#FFFFFF",
    opacity: 1,
  },
  stroke: {
    enabled: true,
    color: "#000000",
    widthPx: 4,
    opacity: 1,
  },
  shadow: {
    enabled: true,
    color: "rgba(0,0,0,0.85)",
    blurPx: 12,
    offsetXPx: 0,
    offsetYPx: 3,
    opacity: 0.85,
  },
  plate: {
    enabled: false,
    color: "rgba(0,0,0,0.5)",
    opacity: 0.25,
    paddingPx: 12,
    radiusPx: 12,
    blurPx: 0,
  },
  highlight: {
    mode: "scale+color",
    activeColor: "#FACC15",
    inactiveOpacity: 0.35,
    scale: 1.2,
    pillColor: "rgba(0,0,0,0.5)",
    pillOpacity: 0.25,
    pillPaddingPx: 6,
    pillRadiusPx: 8,
  },
  motion: {
    lineIn: "pop",
    lineInMs: 150,
    wordPop: true,
    staggerMs: 0,
    typewriterCursor: false,
    cursorBlinkMs: 500,
    bounceScale: 0,
    glowPulse: false,
  },
};

export { FONT_WHITELIST };
