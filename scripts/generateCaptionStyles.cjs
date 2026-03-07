const fs = require("fs");
const path = require("path");

const FAMILIES = [
  "tiktok_classic_pop",
  "subtitle_bar",
  "typewriter_cursor",
  "per_word_pill",
  "glass_pill",
  "marker_highlight",
  "neon_glow",
  "cinematic_plate",
  "kinetic_bounce",
];

const FONTS = [
  "Inter", "Montserrat", "Poppins", "Anton", "Bebas Neue",
  "Playfair Display", "Georgia", "Oswald", "Raleway", "Roboto Condensed",
];

const PALETTES = {
  warm: [
    { fill: "#FFFFFF", active: "#FF6B35", stroke: "#000000", shadow: "rgba(0,0,0,0.7)" },
    { fill: "#FFFFFF", active: "#E74C3C", stroke: "#2C1810", shadow: "rgba(44,24,16,0.6)" },
    { fill: "#FFF8E7", active: "#FF4500", stroke: "#000000", shadow: "rgba(0,0,0,0.5)" },
    { fill: "#FFFFFF", active: "#D4380D", stroke: "#1A1A1A", shadow: "rgba(0,0,0,0.6)" },
    { fill: "#FAFAFA", active: "#CF6A45", stroke: "#000000", shadow: "rgba(0,0,0,0.55)" },
    { fill: "#FFFFFF", active: "#E8590C", stroke: "#222222", shadow: "rgba(0,0,0,0.65)" },
  ],
  cool: [
    { fill: "#FFFFFF", active: "#3B82F6", stroke: "#000000", shadow: "rgba(0,0,0,0.7)" },
    { fill: "#E8F4FD", active: "#0EA5E9", stroke: "#0C2340", shadow: "rgba(12,35,64,0.6)" },
    { fill: "#FFFFFF", active: "#6366F1", stroke: "#000000", shadow: "rgba(0,0,0,0.5)" },
    { fill: "#F0F4FF", active: "#2563EB", stroke: "#1E1B4B", shadow: "rgba(30,27,75,0.5)" },
    { fill: "#FFFFFF", active: "#06B6D4", stroke: "#000000", shadow: "rgba(0,0,0,0.6)" },
    { fill: "#FAFBFF", active: "#818CF8", stroke: "#1A1A2E", shadow: "rgba(26,26,46,0.55)" },
  ],
  neon: [
    { fill: "#FFFFFF", active: "#39FF14", stroke: "#000000", shadow: "rgba(57,255,20,0.4)" },
    { fill: "#FFFFFF", active: "#FF00FF", stroke: "#1A001A", shadow: "rgba(255,0,255,0.3)" },
    { fill: "#FFFFFF", active: "#00FFFF", stroke: "#001A1A", shadow: "rgba(0,255,255,0.3)" },
    { fill: "#F0F0F0", active: "#FF1493", stroke: "#000000", shadow: "rgba(255,20,147,0.35)" },
    { fill: "#FFFFFF", active: "#ADFF2F", stroke: "#0A0A0A", shadow: "rgba(173,255,47,0.3)" },
    { fill: "#FFFFFF", active: "#FF6600", stroke: "#000000", shadow: "rgba(255,102,0,0.35)" },
  ],
  bold: [
    { fill: "#FFFFFF", active: "#FACC15", stroke: "#000000", shadow: "rgba(0,0,0,0.8)" },
    { fill: "#FFFFFF", active: "#EF4444", stroke: "#000000", shadow: "rgba(0,0,0,0.75)" },
    { fill: "#FFFFFF", active: "#22C55E", stroke: "#000000", shadow: "rgba(0,0,0,0.7)" },
    { fill: "#FFFFFF", active: "#F59E0B", stroke: "#111111", shadow: "rgba(0,0,0,0.8)" },
    { fill: "#FFFFFF", active: "#EC4899", stroke: "#000000", shadow: "rgba(0,0,0,0.75)" },
    { fill: "#FFFFFF", active: "#8B5CF6", stroke: "#000000", shadow: "rgba(0,0,0,0.7)" },
  ],
  minimal: [
    { fill: "#FFFFFF", active: "#374151", stroke: "#000000", shadow: "rgba(0,0,0,0.4)" },
    { fill: "#F9FAFB", active: "#1F2937", stroke: "#111827", shadow: "rgba(0,0,0,0.35)" },
    { fill: "#FFFFFF", active: "#6B7280", stroke: "#000000", shadow: "rgba(0,0,0,0.3)" },
    { fill: "#FAFAFA", active: "#4B5563", stroke: "#1A1A1A", shadow: "rgba(0,0,0,0.35)" },
    { fill: "#F5F5F5", active: "#111827", stroke: "#000000", shadow: "rgba(0,0,0,0.4)" },
    { fill: "#FFFFFF", active: "#9CA3AF", stroke: "#222222", shadow: "rgba(0,0,0,0.3)" },
  ],
  luxury: [
    { fill: "#FFFFFF", active: "#D4AF37", stroke: "#1A1A1A", shadow: "rgba(0,0,0,0.6)" },
    { fill: "#FFF8F0", active: "#B8860B", stroke: "#000000", shadow: "rgba(0,0,0,0.5)" },
    { fill: "#FFFFFF", active: "#C0A35A", stroke: "#0D0D0D", shadow: "rgba(0,0,0,0.55)" },
    { fill: "#FAFAF5", active: "#8B7355", stroke: "#000000", shadow: "rgba(0,0,0,0.5)" },
    { fill: "#FFFFFF", active: "#A0522D", stroke: "#1A1A1A", shadow: "rgba(0,0,0,0.6)" },
    { fill: "#F8F4EF", active: "#DAA520", stroke: "#111111", shadow: "rgba(0,0,0,0.55)" },
  ],
  vibrant: [
    { fill: "#FFFFFF", active: "#7C3AED", stroke: "#000000", shadow: "rgba(0,0,0,0.7)" },
    { fill: "#FFFFFF", active: "#DB2777", stroke: "#1A001A", shadow: "rgba(0,0,0,0.6)" },
    { fill: "#FFFFFF", active: "#10B981", stroke: "#000000", shadow: "rgba(0,0,0,0.5)" },
    { fill: "#FFFFFF", active: "#F97316", stroke: "#111111", shadow: "rgba(0,0,0,0.65)" },
    { fill: "#FFFFFF", active: "#14B8A6", stroke: "#000000", shadow: "rgba(0,0,0,0.55)" },
    { fill: "#FFFFFF", active: "#E11D48", stroke: "#0A0A0A", shadow: "rgba(0,0,0,0.6)" },
  ],
};

const CATEGORY_NAMES = Object.keys(PALETTES);

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, decimals = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)); }

function familyBaseConfig(family) {
  switch (family) {
    case "tiktok_classic_pop":
      return {
        typography: { fontWeight: pick([700, 800, 900]), fontSizePx: randInt(76, 92), textTransform: pick(["uppercase", "none"]) },
        layout: { position: pick(["middle", "bottom"]), safeMarginPx: randInt(40, 100) },
        stroke: { enabled: true, widthPx: randInt(2, 4) },
        shadow: { enabled: true, blurPx: randInt(6, 14) },
        plate: { enabled: false },
        highlight: { mode: pick(["scale+color", "color", "scale"]), scale: randFloat(1.1, 1.25), inactiveOpacity: randFloat(0.3, 0.5) },
        motion: { lineIn: pick(["fade-up", "pop"]), wordPop: true, staggerMs: 0, typewriterCursor: false, bounceScale: 0, glowPulse: false },
      };
    case "subtitle_bar":
      return {
        typography: { fontWeight: pick([500, 600, 700]), fontSizePx: randInt(60, 76), textTransform: "none" },
        layout: { position: "bottom", safeMarginPx: randInt(40, 80) },
        stroke: { enabled: false, widthPx: 0 },
        shadow: { enabled: false, blurPx: 0 },
        plate: { enabled: true, radiusPx: randInt(6, 14), paddingPx: randInt(10, 18), blurPx: 0, opacity: randFloat(0.6, 0.85) },
        highlight: { mode: pick(["color", "none"]), scale: 1, inactiveOpacity: randFloat(0.7, 0.9) },
        motion: { lineIn: "fade-in", wordPop: false, staggerMs: 0, typewriterCursor: false, bounceScale: 0, glowPulse: false },
      };
    case "typewriter_cursor":
      return {
        typography: { fontWeight: pick([400, 500, 600]), fontSizePx: randInt(60, 80), textTransform: "none" },
        layout: { position: pick(["top", "middle"]), safeMarginPx: randInt(50, 100) },
        stroke: { enabled: false, widthPx: 0 },
        shadow: { enabled: true, blurPx: randInt(4, 10) },
        plate: { enabled: false },
        highlight: { mode: "none", scale: 1, inactiveOpacity: 1 },
        motion: { lineIn: "fade-in", wordPop: false, staggerMs: 0, typewriterCursor: true, cursorBlinkMs: randInt(350, 600), bounceScale: 0, glowPulse: false },
      };
    case "per_word_pill":
      return {
        typography: { fontWeight: pick([600, 700, 800]), fontSizePx: randInt(68, 84), textTransform: pick(["none", "uppercase"]) },
        layout: { position: pick(["middle", "bottom"]), safeMarginPx: randInt(60, 100) },
        stroke: { enabled: false, widthPx: 0 },
        shadow: { enabled: true, blurPx: randInt(4, 8) },
        plate: { enabled: false },
        highlight: { mode: "pill", scale: randFloat(1.0, 1.12), inactiveOpacity: randFloat(0.35, 0.55), pillPaddingPx: randInt(6, 12), pillRadiusPx: randInt(6, 16) },
        motion: { lineIn: "fade-up", wordPop: false, staggerMs: 0, typewriterCursor: false, bounceScale: 0, glowPulse: false },
      };
    case "glass_pill":
      return {
        typography: { fontWeight: pick([500, 600, 700]), fontSizePx: randInt(64, 80), textTransform: "none" },
        layout: { position: "bottom", safeMarginPx: randInt(60, 100) },
        stroke: { enabled: false, widthPx: 0 },
        shadow: { enabled: true, blurPx: randInt(4, 8) },
        plate: { enabled: true, radiusPx: randInt(16, 30), paddingPx: randInt(12, 18), blurPx: randInt(8, 16), opacity: randFloat(0.3, 0.5) },
        highlight: { mode: "pill", scale: 1, inactiveOpacity: randFloat(0.5, 0.7), pillPaddingPx: randInt(6, 10), pillRadiusPx: randInt(8, 14) },
        motion: { lineIn: "fade-up", wordPop: false, staggerMs: 0, typewriterCursor: false, bounceScale: 0, glowPulse: false },
      };
    case "marker_highlight":
      return {
        typography: { fontWeight: pick([600, 700, 800]), fontSizePx: randInt(72, 88), textTransform: pick(["none", "uppercase"]) },
        layout: { position: pick(["middle", "bottom"]), safeMarginPx: randInt(60, 100) },
        stroke: { enabled: true, widthPx: randInt(1, 3) },
        shadow: { enabled: true, blurPx: randInt(4, 10) },
        plate: { enabled: false },
        highlight: { mode: "color", scale: 1, inactiveOpacity: randFloat(0.35, 0.55) },
        motion: { lineIn: "fade-up", wordPop: false, staggerMs: 0, typewriterCursor: false, bounceScale: 0, glowPulse: false },
      };
    case "neon_glow":
      return {
        typography: { fontWeight: pick([600, 700, 800, 900]), fontSizePx: randInt(72, 90), textTransform: pick(["none", "uppercase"]) },
        layout: { position: pick(["middle", "bottom"]), safeMarginPx: randInt(60, 100) },
        stroke: { enabled: true, widthPx: randInt(1, 2) },
        shadow: { enabled: true, blurPx: randInt(12, 25) },
        plate: { enabled: false },
        highlight: { mode: "color", scale: 1, inactiveOpacity: randFloat(0.3, 0.5) },
        motion: { lineIn: "fade-in", wordPop: false, staggerMs: 0, typewriterCursor: false, bounceScale: 0, glowPulse: pick([true, true, false]) },
      };
    case "cinematic_plate":
      return {
        typography: { fontWeight: pick([400, 500, 600]), fontSizePx: randInt(56, 72), textTransform: "none" },
        layout: { position: "bottom", safeMarginPx: randInt(60, 100) },
        stroke: { enabled: false, widthPx: 0 },
        shadow: { enabled: false, blurPx: 0 },
        plate: { enabled: true, radiusPx: randInt(8, 16), paddingPx: randInt(14, 22), blurPx: randInt(0, 6), opacity: randFloat(0.5, 0.75) },
        highlight: { mode: pick(["color", "none"]), scale: 1, inactiveOpacity: randFloat(0.65, 0.85) },
        motion: { lineIn: "fade-up", lineInMs: randInt(250, 400), wordPop: false, staggerMs: 0, typewriterCursor: false, bounceScale: 0, glowPulse: false },
      };
    case "kinetic_bounce":
      return {
        typography: { fontWeight: pick([700, 800, 900]), fontSizePx: randInt(72, 88), textTransform: pick(["none", "uppercase"]) },
        layout: { position: pick(["middle", "bottom"]), safeMarginPx: randInt(60, 100) },
        stroke: { enabled: true, widthPx: randInt(2, 4) },
        shadow: { enabled: true, blurPx: randInt(6, 12) },
        plate: { enabled: false },
        highlight: { mode: pick(["color", "scale+color"]), scale: randFloat(1.05, 1.15), inactiveOpacity: randFloat(0.3, 0.5) },
        motion: { lineIn: "none", wordPop: false, staggerMs: randInt(30, 80), typewriterCursor: false, bounceScale: randFloat(0.2, 0.6), glowPulse: false },
      };
    default:
      return familyBaseConfig("tiktok_classic_pop");
  }
}

function generateStylesForFamily(family, count) {
  const styles = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    const catName = pick(CATEGORY_NAMES);
    const palette = pick(PALETTES[catName]);
    const font = pick(FONTS);
    const base = familyBaseConfig(family);

    const familyLabel = {
      tiktok_classic_pop: "TikTok Pop",
      subtitle_bar: "Bar",
      typewriter_cursor: "Typewriter",
      per_word_pill: "Pill",
      glass_pill: "Glass",
      marker_highlight: "Marker",
      neon_glow: "Neon",
      cinematic_plate: "Cinema",
      kinetic_bounce: "Bounce",
    }[family] || family;

    let name = `${familyLabel} ${font} ${catName.charAt(0).toUpperCase() + catName.slice(1)} ${i + 1}`;
    while (usedNames.has(name)) name += "v";
    usedNames.add(name);

    const id = `${family}-${catName}-${font.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`;

    const plateColor = family === "neon_glow" ? "rgba(0,0,0,0.8)" : `rgba(0,0,0,${randFloat(0.4, 0.7)})`;
    const pillOpacity = randFloat(0.2, 0.5);

    styles.push({
      id,
      name,
      category: catName,
      styleFamily: family,
      typography: {
        fontFamily: font,
        fontWeight: base.typography.fontWeight,
        fontSizePx: base.typography.fontSizePx,
        letterSpacingPx: randFloat(-1, 3),
        lineHeight: randFloat(1.1, 1.4),
        textTransform: base.typography.textTransform,
      },
      layout: {
        position: base.layout.position,
        safeMarginPx: base.layout.safeMarginPx,
        maxLines: 2,
        maxWidthPct: randInt(80, 95),
        align: "center",
        wordSpacingPx: randInt(4, 10),
      },
      fill: { color: palette.fill, opacity: 1 },
      stroke: {
        enabled: base.stroke.enabled,
        color: palette.stroke,
        widthPx: base.stroke.widthPx,
        opacity: 1,
      },
      shadow: {
        enabled: base.shadow.enabled,
        color: palette.shadow,
        blurPx: base.shadow.blurPx,
        offsetXPx: 0,
        offsetYPx: randInt(1, 3),
        opacity: randFloat(0.5, 0.8),
      },
      plate: {
        enabled: base.plate.enabled || false,
        color: plateColor,
        opacity: base.plate.opacity || 0.25,
        paddingPx: base.plate.paddingPx || 12,
        radiusPx: base.plate.radiusPx || 12,
        blurPx: base.plate.blurPx || 0,
      },
      highlight: {
        mode: base.highlight.mode,
        activeColor: palette.active,
        inactiveOpacity: base.highlight.inactiveOpacity,
        scale: base.highlight.scale,
        pillColor: palette.active,
        pillOpacity,
        pillPaddingPx: base.highlight.pillPaddingPx || 6,
        pillRadiusPx: base.highlight.pillRadiusPx || 8,
      },
      motion: {
        lineIn: base.motion.lineIn,
        lineInMs: base.motion.lineInMs || randInt(150, 300),
        wordPop: base.motion.wordPop || false,
        staggerMs: base.motion.staggerMs || 0,
        typewriterCursor: base.motion.typewriterCursor || false,
        cursorBlinkMs: base.motion.cursorBlinkMs || 500,
        bounceScale: base.motion.bounceScale || 0,
        glowPulse: base.motion.glowPulse || false,
      },
    });
  }

  return styles;
}

function main() {
  const TARGET = 504;
  const perFamily = Math.ceil(TARGET / FAMILIES.length);

  let allStyles = [];
  for (const family of FAMILIES) {
    allStyles = allStyles.concat(generateStylesForFamily(family, perFamily));
  }

  const ids = new Set();
  allStyles = allStyles.filter((s) => {
    if (ids.has(s.id)) return false;
    ids.add(s.id);
    return true;
  });

  const dist = {};
  for (const s of allStyles) {
    dist[s.styleFamily] = (dist[s.styleFamily] || 0) + 1;
  }
  console.log(`Generated ${allStyles.length} styles:`);
  for (const [k, v] of Object.entries(dist).sort()) {
    console.log(`  ${k}: ${v}`);
  }

  const jsonStr = JSON.stringify(allStyles, null, 2);

  const outPaths = [
    path.join(__dirname, "..", "src", "captions", "styles", "generated.json"),
    path.join(__dirname, "..", "client", "src", "lib", "captionStyles", "generated.json"),
  ];

  for (const p of outPaths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, jsonStr);
    console.log(`Wrote ${p}`);
  }
}

main();
