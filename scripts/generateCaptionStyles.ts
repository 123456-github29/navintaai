import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CaptionStyleSpec {
  id: string;
  name: string;
  category: string;
  typography: {
    fontFamily: string;
    fontWeight: number;
    fontSizePx: number;
    letterSpacingPx: number;
    lineHeight: number;
    textTransform: "none" | "uppercase" | "lowercase";
  };
  layout: {
    position: "bottom" | "middle" | "top";
    safeMarginPx: number;
    maxLines: number;
    maxWidthPct: number;
    align: "center" | "left" | "right";
    wordSpacingPx: number;
  };
  fill: { color: string; opacity: number };
  stroke: { enabled: boolean; color: string; widthPx: number; opacity: number };
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
    mode: "none" | "color" | "scale" | "pill" | "scale+color" | "pill+scale";
    activeColor: string;
    inactiveOpacity: number;
    scale: number;
    pillColor: string;
    pillOpacity: number;
    pillPaddingPx: number;
    pillRadiusPx: number;
  };
  motion: {
    lineIn: "none" | "fade-up" | "fade-in" | "pop";
    lineInMs: number;
    wordPop: boolean;
  };
}

const FONTS = [
  { name: "Inter", weights: [500, 600, 700, 800, 900] },
  { name: "Montserrat", weights: [600, 700, 800, 900] },
  { name: "Poppins", weights: [500, 600, 700, 800, 900] },
  { name: "Anton", weights: [400] },
  { name: "Bebas Neue", weights: [400] },
  { name: "Playfair Display", weights: [700, 800, 900] },
  { name: "Oswald", weights: [500, 600, 700] },
  { name: "Raleway", weights: [600, 700, 800, 900] },
  { name: "Roboto Condensed", weights: [700] },
  { name: "Georgia", weights: [400, 700] },
];

interface Palette {
  name: string;
  category: string;
  fillColor: string;
  activeColor: string;
  strokeColor: string;
  shadowColor: string;
  plateColor?: string;
  pillColor?: string;
}

const PALETTES: Palette[] = [
  { name: "Classic White", category: "classic", fillColor: "#FFFFFF", activeColor: "#FACC15", strokeColor: "#000000", shadowColor: "rgba(0,0,0,0.7)" },
  { name: "MrBeast", category: "bold", fillColor: "#FFFFFF", activeColor: "#FF0000", strokeColor: "#000000", shadowColor: "rgba(0,0,0,0.8)" },
  { name: "MrBeast Yellow", category: "bold", fillColor: "#FFFFFF", activeColor: "#FFD700", strokeColor: "#000000", shadowColor: "rgba(0,0,0,0.8)" },
  { name: "Neon Cyan", category: "neon", fillColor: "#FFFFFF", activeColor: "#00FFD1", strokeColor: "#003333", shadowColor: "rgba(0,255,209,0.4)" },
  { name: "Neon Blue", category: "neon", fillColor: "#FFFFFF", activeColor: "#3B82F6", strokeColor: "#001133", shadowColor: "rgba(59,130,246,0.4)" },
  { name: "Neon Pink", category: "neon", fillColor: "#FFFFFF", activeColor: "#FF1493", strokeColor: "#330011", shadowColor: "rgba(255,20,147,0.4)" },
  { name: "Neon Green", category: "neon", fillColor: "#FFFFFF", activeColor: "#00FF88", strokeColor: "#003311", shadowColor: "rgba(0,255,136,0.4)" },
  { name: "Neon Purple", category: "neon", fillColor: "#FFFFFF", activeColor: "#A855F7", strokeColor: "#110033", shadowColor: "rgba(168,85,247,0.4)" },
  { name: "Hot Pink", category: "vibrant", fillColor: "#FFFFFF", activeColor: "#FF006E", strokeColor: "#000000", shadowColor: "rgba(255,0,110,0.4)" },
  { name: "Sunset", category: "warm", fillColor: "#FFFFFF", activeColor: "#F97316", strokeColor: "#000000", shadowColor: "rgba(249,115,22,0.4)" },
  { name: "Luxury Gold", category: "luxury", fillColor: "#F5E6D3", activeColor: "#D4AF37", strokeColor: "transparent", shadowColor: "rgba(212,175,55,0.3)" },
  { name: "Luxury Silver", category: "luxury", fillColor: "#E8E8E8", activeColor: "#C0C0C0", strokeColor: "#333333", shadowColor: "rgba(192,192,192,0.3)" },
  { name: "Emerald", category: "vibrant", fillColor: "#FFFFFF", activeColor: "#10B981", strokeColor: "#000000", shadowColor: "rgba(16,185,129,0.4)" },
  { name: "Fire", category: "bold", fillColor: "#FFFFFF", activeColor: "#EF4444", strokeColor: "#000000", shadowColor: "rgba(239,68,68,0.5)" },
  { name: "Ice Blue", category: "minimal", fillColor: "#E0F2FE", activeColor: "#38BDF8", strokeColor: "transparent", shadowColor: "rgba(56,189,248,0.3)" },
  { name: "Coral", category: "warm", fillColor: "#FFFFFF", activeColor: "#FB7185", strokeColor: "#000000", shadowColor: "rgba(251,113,133,0.4)" },
  { name: "Mint", category: "minimal", fillColor: "#FFFFFF", activeColor: "#34D399", strokeColor: "transparent", shadowColor: "rgba(52,211,153,0.3)" },
  { name: "Indigo", category: "vibrant", fillColor: "#FFFFFF", activeColor: "#6366F1", strokeColor: "#000000", shadowColor: "rgba(99,102,241,0.4)" },
  { name: "Amber", category: "warm", fillColor: "#FFFFFF", activeColor: "#F59E0B", strokeColor: "#000000", shadowColor: "rgba(245,158,11,0.4)" },
  { name: "Rose", category: "minimal", fillColor: "#FFFFFF", activeColor: "#E11D48", strokeColor: "transparent", shadowColor: "rgba(225,29,72,0.3)" },
  { name: "Monochrome", category: "classic", fillColor: "#FFFFFF", activeColor: "#FFFFFF", strokeColor: "#000000", shadowColor: "rgba(0,0,0,0.8)" },
  { name: "Dark Plate", category: "classic", fillColor: "#FFFFFF", activeColor: "#FACC15", strokeColor: "transparent", shadowColor: "rgba(0,0,0,0.3)", plateColor: "rgba(0,0,0,0.65)" },
  { name: "Yellow Marker", category: "bold", fillColor: "#000000", activeColor: "#000000", strokeColor: "transparent", shadowColor: "transparent", pillColor: "#FACC15" },
  { name: "Red Marker", category: "bold", fillColor: "#FFFFFF", activeColor: "#FFFFFF", strokeColor: "transparent", shadowColor: "transparent", pillColor: "#EF4444" },
  { name: "Blue Marker", category: "vibrant", fillColor: "#FFFFFF", activeColor: "#FFFFFF", strokeColor: "transparent", shadowColor: "transparent", pillColor: "#3B82F6" },
  { name: "Pastel Lavender", category: "minimal", fillColor: "#FFFFFF", activeColor: "#C084FC", strokeColor: "transparent", shadowColor: "rgba(192,132,252,0.3)" },
  { name: "Documentary", category: "classic", fillColor: "#FFFFFF", activeColor: "#FBBF24", strokeColor: "transparent", shadowColor: "rgba(0,0,0,0.5)", plateColor: "rgba(0,0,0,0.6)" },
  { name: "Teal Glow", category: "neon", fillColor: "#FFFFFF", activeColor: "#2DD4BF", strokeColor: "#003333", shadowColor: "rgba(45,212,191,0.5)" },
];

const HIGHLIGHT_MODES: CaptionStyleSpec["highlight"]["mode"][] = [
  "none", "color", "scale", "pill", "scale+color", "pill+scale",
];

const MOTION_TYPES: CaptionStyleSpec["motion"]["lineIn"][] = [
  "none", "fade-up", "fade-in", "pop",
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.round(rand(min, max));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function luminance(hex: string): number {
  if (!hex.startsWith("#") || hex.length < 7) return 0.5;
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(c1: string, c2: string): number {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function generateSpec(index: number): CaptionStyleSpec {
  const palette = pick(PALETTES);
  const fontDef = pick(FONTS);
  const weight = pick(fontDef.weights);
  const fontSize = randInt(64, 104);
  const highlightMode = pick(HIGHLIGHT_MODES);
  const motionType = pick(MOTION_TYPES);

  const useStroke = Math.random() < 0.55;
  const useShadow = Math.random() < 0.75;
  const usePlate = !!palette.plateColor || Math.random() < 0.18;
  const useUppercase = Math.random() < 0.35;

  const strokeWidth = useStroke
    ? (palette.strokeColor !== "transparent" ? rand(1.5, 5) : 0)
    : 0;

  const shadowBlur = useShadow ? rand(4, 20) : 0;

  const plateOpacity = usePlate ? rand(0.15, 0.45) : 0;
  const plateColor = palette.plateColor || "rgba(0,0,0,0.5)";

  const highlightScale = rand(1.08, 1.28);

  const pillColor = palette.pillColor || palette.activeColor;

  const suffix = `${slugify(palette.name)}-${slugify(fontDef.name)}-${index}`;
  const adjectives = [
    "Clean", "Bold", "Crisp", "Vivid", "Sharp", "Smooth", "Dynamic", "Sleek",
    "Modern", "Fresh", "Prime", "Ultra", "Elite", "Pure", "Pro", "Max", "Lux",
    "Pop", "Swift", "Bright", "Deep", "Glow", "Flash", "Edge", "Core", "Zen",
    "Blaze", "Storm", "Wave", "Drift", "Pulse", "Spark",
  ];
  const name = `${pick(adjectives)} ${palette.name}`;

  return {
    id: suffix,
    name,
    category: palette.category,
    typography: {
      fontFamily: fontDef.name,
      fontWeight: weight,
      fontSizePx: fontSize,
      letterSpacingPx: parseFloat(rand(-1, 3).toFixed(1)),
      lineHeight: parseFloat(rand(1.0, 1.35).toFixed(2)),
      textTransform: useUppercase ? "uppercase" : "none",
    },
    layout: {
      position: pick(["bottom", "bottom", "bottom", "middle"] as const),
      safeMarginPx: randInt(50, 120),
      maxLines: pick([1, 2, 2]),
      maxWidthPct: randInt(80, 95),
      align: "center",
      wordSpacingPx: randInt(4, 10),
    },
    fill: {
      color: palette.fillColor,
      opacity: 1,
    },
    stroke: {
      enabled: useStroke && strokeWidth > 0,
      color: palette.strokeColor,
      widthPx: parseFloat(strokeWidth.toFixed(1)),
      opacity: 1,
    },
    shadow: {
      enabled: useShadow,
      color: palette.shadowColor,
      blurPx: parseFloat(shadowBlur.toFixed(1)),
      offsetXPx: 0,
      offsetYPx: useShadow ? parseFloat(rand(1, 4).toFixed(1)) : 0,
      opacity: useShadow ? parseFloat(rand(0.5, 0.9).toFixed(2)) : 0,
    },
    plate: {
      enabled: usePlate,
      color: plateColor,
      opacity: parseFloat(plateOpacity.toFixed(2)),
      paddingPx: usePlate ? randInt(8, 20) : 12,
      radiusPx: usePlate ? randInt(6, 20) : 12,
      blurPx: usePlate && Math.random() < 0.3 ? randInt(4, 16) : 0,
    },
    highlight: {
      mode: highlightMode,
      activeColor: palette.activeColor,
      inactiveOpacity: parseFloat(rand(0.25, 0.55).toFixed(2)),
      scale: parseFloat(highlightScale.toFixed(2)),
      pillColor: pillColor,
      pillOpacity: parseFloat(rand(0.2, 0.5).toFixed(2)),
      pillPaddingPx: randInt(4, 10),
      pillRadiusPx: randInt(4, 14),
    },
    motion: {
      lineIn: motionType,
      lineInMs: randInt(120, 350),
      wordPop: Math.random() < 0.3,
    },
  };
}

function scoreSpec(spec: CaptionStyleSpec): number {
  let score = 50;

  const fs = spec.typography.fontSizePx;
  if (fs >= 72 && fs <= 96) score += 10;
  else if (fs >= 64 && fs <= 104) score += 5;
  else score -= 5;

  if (spec.stroke.enabled && spec.stroke.widthPx > 0) {
    score += 8;
    const fillLum = luminance(spec.fill.color);
    const strokeLum = luminance(spec.stroke.color);
    const diff = Math.abs(fillLum - strokeLum);
    if (diff > 0.5) score += 6;
    else if (diff > 0.3) score += 3;
    else score -= 3;

    if (spec.stroke.widthPx > 5) score -= 4;
    if (spec.stroke.widthPx > 6) score -= 6;
  }

  if (spec.shadow.enabled && spec.shadow.blurPx > 0) {
    score += 6;
    if (spec.shadow.blurPx > 25) score -= 4;
  }

  if (spec.stroke.enabled || spec.shadow.enabled) {
    score += 4;
  } else if (!spec.plate.enabled) {
    score -= 10;
  }

  if (spec.plate.enabled) {
    if (spec.plate.opacity >= 0.15 && spec.plate.opacity <= 0.4) score += 5;
    else if (spec.plate.opacity > 0.55) score -= 3;
  }

  const hl = spec.highlight;
  if (hl.mode !== "none") {
    score += 4;
    if (hl.mode === "scale+color" || hl.mode === "pill+scale") score += 3;
    if (hl.mode === "color") score += 2;

    if (hl.scale >= 1.10 && hl.scale <= 1.24) score += 4;
    else if (hl.scale > 1.30) score -= 3;
  }

  if (spec.fill.color.startsWith("#")) {
    const cr = contrastRatio(spec.fill.color, "#000000");
    if (cr > 7) score += 4;
    else if (cr > 4.5) score += 2;
    else score -= 5;
  }

  if (Math.abs(spec.typography.letterSpacingPx) > 4) score -= 4;
  if (spec.typography.letterSpacingPx > 5) score -= 6;

  if (spec.typography.lineHeight < 0.95) score -= 4;
  if (spec.typography.lineHeight > 1.5) score -= 2;

  if (spec.highlight.inactiveOpacity < 0.2) score -= 3;
  if (spec.highlight.inactiveOpacity > 0.7) score -= 3;

  if (spec.motion.lineIn !== "none") score += 2;

  return score;
}

function main() {
  const GENERATE_COUNT = 5000;
  const KEEP_COUNT = 500;
  const MIN_PER_CATEGORY = 40;

  console.log(`Generating ${GENERATE_COUNT} caption style specs...`);

  const allSpecs: { spec: CaptionStyleSpec; score: number }[] = [];
  for (let i = 0; i < GENERATE_COUNT; i++) {
    const spec = generateSpec(i);
    const score = scoreSpec(spec);
    allSpecs.push({ spec, score });
  }

  allSpecs.sort((a, b) => b.score - a.score);

  const categoryBuckets: Record<string, { spec: CaptionStyleSpec; score: number }[]> = {};
  for (const item of allSpecs) {
    const cat = item.spec.category;
    if (!categoryBuckets[cat]) categoryBuckets[cat] = [];
    categoryBuckets[cat].push(item);
  }

  const kept: CaptionStyleSpec[] = [];
  const usedIds = new Set<string>();

  for (const [cat, bucket] of Object.entries(categoryBuckets)) {
    const toTake = Math.min(bucket.length, MIN_PER_CATEGORY);
    for (let i = 0; i < toTake; i++) {
      const s = bucket[i].spec;
      if (!usedIds.has(s.id)) {
        usedIds.add(s.id);
        kept.push(s);
      }
    }
  }

  for (const item of allSpecs) {
    if (kept.length >= KEEP_COUNT) break;
    if (!usedIds.has(item.spec.id)) {
      usedIds.add(item.spec.id);
      kept.push(item.spec);
    }
  }

  const finalIds = new Set<string>();
  const dedupedKept: CaptionStyleSpec[] = [];
  for (const spec of kept) {
    let id = spec.id;
    let counter = 1;
    while (finalIds.has(id)) {
      id = `${spec.id}-${counter}`;
      counter++;
    }
    spec.id = id;
    finalIds.add(id);
    dedupedKept.push(spec);
  }

  const categories: Record<string, number> = {};
  for (const s of dedupedKept) {
    categories[s.category] = (categories[s.category] || 0) + 1;
  }

  console.log(`\nKept ${dedupedKept.length} styles:`);
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  const outDir = path.join(__dirname, "..", "src", "captions", "styles");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, "generated.json");
  fs.writeFileSync(outPath, JSON.stringify(dedupedKept, null, 2));
  console.log(`\nWritten to ${outPath}`);

  const clientOutDir = path.join(__dirname, "..", "client", "src", "lib", "captionStyles");
  if (!fs.existsSync(clientOutDir)) {
    fs.mkdirSync(clientOutDir, { recursive: true });
  }
  const clientOutPath = path.join(clientOutDir, "generated.json");
  fs.writeFileSync(clientOutPath, JSON.stringify(dedupedKept, null, 2));
  console.log(`Written to ${clientOutPath}`);
}

main();
