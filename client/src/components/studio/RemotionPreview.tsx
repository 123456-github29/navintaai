import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { TikTokComposition } from "@remotion-src/TikTokComposition";
import type { EDL } from "@remotion-src/types/edl";
import type { CaptionStyleSpec } from "../../../src/captions/styleSpec";

const DEFAULT_SPEC: CaptionStyleSpec = {
  id: "default",
  name: "Viral Pop",
  category: "bold",
  styleFamily: "tiktok_classic_pop",
  typography: { fontFamily: "Montserrat", fontWeight: 900, fontSizePx: 76, letterSpacingPx: 0.5, lineHeight: 1.15, textTransform: "uppercase" },
  layout: { position: "bottom", safeMarginPx: 90, maxLines: 2, maxWidthPct: 88, align: "center", wordSpacingPx: 8 },
  fill: { color: "#FFFFFF", opacity: 1 },
  stroke: { enabled: true, color: "#000000", widthPx: 4, opacity: 1 },
  shadow: { enabled: true, color: "rgba(0,0,0,0.85)", blurPx: 12, offsetXPx: 0, offsetYPx: 3, opacity: 0.85 },
  plate: { enabled: false, color: "rgba(0,0,0,0.5)", opacity: 0.25, paddingPx: 12, radiusPx: 12, blurPx: 0 },
  highlight: { mode: "scale+color", activeColor: "#FACC15", inactiveOpacity: 0.35, scale: 1.2, pillColor: "rgba(0,0,0,0.5)", pillOpacity: 0.25, pillPaddingPx: 6, pillRadiusPx: 8 },
  motion: { lineIn: "pop", lineInMs: 150, wordPop: true, staggerMs: 0, typewriterCursor: false, cursorBlinkMs: 500, bounceScale: 0, glowPulse: false },
};

const CAPTION_STYLE_MAP: Record<string, CaptionStyleSpec> = {
  default: DEFAULT_SPEC,

  kinetic_bounce: {
    ...DEFAULT_SPEC,
    id: "kinetic_bounce",
    name: "Kinetic Bounce",
    category: "energetic",
    styleFamily: "kinetic_bounce",
    typography: { ...DEFAULT_SPEC.typography, fontFamily: "Poppins", fontWeight: 800, fontSizePx: 82, textTransform: "uppercase" },
    fill: { color: "#FFFFFF", opacity: 1 },
    stroke: { enabled: true, color: "#000000", widthPx: 5, opacity: 1 },
    highlight: { ...DEFAULT_SPEC.highlight, activeColor: "#FF3366", scale: 1.3, mode: "scale+color" },
    motion: { ...DEFAULT_SPEC.motion, wordPop: true, bounceScale: 0.25, lineIn: "pop", lineInMs: 100 },
  },

  cinematic_plate: {
    ...DEFAULT_SPEC,
    id: "cinematic_plate",
    name: "Cinematic Plate",
    category: "cinematic",
    styleFamily: "cinematic_plate",
    typography: { fontFamily: "Playfair Display", fontWeight: 600, fontSizePx: 68, letterSpacingPx: 2, lineHeight: 1.3, textTransform: "none" },
    layout: { ...DEFAULT_SPEC.layout, position: "bottom", safeMarginPx: 110, maxLines: 2 },
    fill: { color: "#F5E6C8", opacity: 1 },
    stroke: { enabled: false, color: "#000000", widthPx: 0, opacity: 0 },
    shadow: { enabled: true, color: "rgba(0,0,0,0.9)", blurPx: 20, offsetXPx: 0, offsetYPx: 4, opacity: 0.9 },
    plate: { enabled: true, color: "rgba(0,0,0,0.65)", opacity: 0.7, paddingPx: 18, radiusPx: 6, blurPx: 8 },
    highlight: { ...DEFAULT_SPEC.highlight, activeColor: "#F5E6C8", inactiveOpacity: 0.5, scale: 1.05, mode: "color" },
    motion: { ...DEFAULT_SPEC.motion, lineIn: "fade-up", lineInMs: 300, wordPop: false, bounceScale: 0 },
  },

  impact_flash: {
    ...DEFAULT_SPEC,
    id: "impact_flash",
    name: "Impact Flash",
    category: "bold",
    styleFamily: "tiktok_classic_pop",
    typography: { fontFamily: "Anton", fontWeight: 900, fontSizePx: 90, letterSpacingPx: 1, lineHeight: 1.1, textTransform: "uppercase" },
    fill: { color: "#FFD700", opacity: 1 },
    stroke: { enabled: true, color: "#000000", widthPx: 6, opacity: 1 },
    shadow: { enabled: true, color: "rgba(0,0,0,1)", blurPx: 0, offsetXPx: 4, offsetYPx: 4, opacity: 1 },
    highlight: { ...DEFAULT_SPEC.highlight, activeColor: "#FF0000", inactiveOpacity: 0.4, scale: 1.25, mode: "scale+color" },
    motion: { ...DEFAULT_SPEC.motion, lineIn: "pop", lineInMs: 80, wordPop: true, bounceScale: 0.15 },
  },

  karaoke_glow: {
    ...DEFAULT_SPEC,
    id: "karaoke_glow",
    name: "Karaoke Glow",
    category: "vibrant",
    styleFamily: "neon_glow",
    typography: { fontFamily: "Montserrat", fontWeight: 800, fontSizePx: 78, letterSpacingPx: 0.5, lineHeight: 1.2, textTransform: "uppercase" },
    fill: { color: "#FFFFFF", opacity: 1 },
    stroke: { enabled: true, color: "#7C3AED", widthPx: 3, opacity: 0.8 },
    shadow: { enabled: true, color: "rgba(124,58,237,0.8)", blurPx: 18, offsetXPx: 0, offsetYPx: 0, opacity: 0.8 },
    highlight: { ...DEFAULT_SPEC.highlight, activeColor: "#A78BFA", inactiveOpacity: 0.3, scale: 1.15, mode: "scale+color", pillColor: "rgba(124,58,237,0.4)", pillOpacity: 0.4, pillRadiusPx: 10 },
    motion: { ...DEFAULT_SPEC.motion, lineIn: "fade-in", lineInMs: 200, wordPop: true, glowPulse: true, bounceScale: 0 },
  },

  minimal_fade: {
    ...DEFAULT_SPEC,
    id: "minimal_fade",
    name: "Minimal Fade",
    category: "minimal",
    styleFamily: "subtitle_bar",
    typography: { fontFamily: "Inter", fontWeight: 400, fontSizePx: 62, letterSpacingPx: 0.2, lineHeight: 1.4, textTransform: "none" },
    fill: { color: "#FFFFFF", opacity: 0.92 },
    stroke: { enabled: false, color: "#000000", widthPx: 0, opacity: 0 },
    shadow: { enabled: true, color: "rgba(0,0,0,0.6)", blurPx: 8, offsetXPx: 0, offsetYPx: 2, opacity: 0.6 },
    plate: { enabled: false, color: "rgba(0,0,0,0.4)", opacity: 0.4, paddingPx: 10, radiusPx: 4, blurPx: 0 },
    highlight: { ...DEFAULT_SPEC.highlight, activeColor: "#FFFFFF", inactiveOpacity: 0.45, scale: 1.05, mode: "color" },
    motion: { ...DEFAULT_SPEC.motion, lineIn: "fade-in", lineInMs: 350, wordPop: false, bounceScale: 0, staggerMs: 30 },
  },

  bold_stack: {
    ...DEFAULT_SPEC,
    id: "bold_stack",
    name: "Bold Stack",
    category: "bold",
    styleFamily: "tiktok_classic_pop",
    typography: { fontFamily: "Oswald", fontWeight: 700, fontSizePx: 84, letterSpacingPx: 1.5, lineHeight: 1.1, textTransform: "uppercase" },
    fill: { color: "#FFFFFF", opacity: 1 },
    stroke: { enabled: true, color: "#000000", widthPx: 5, opacity: 1 },
    shadow: { enabled: true, color: "rgba(0,0,0,0.9)", blurPx: 6, offsetXPx: 3, offsetYPx: 3, opacity: 0.9 },
    highlight: { ...DEFAULT_SPEC.highlight, activeColor: "#00FF88", inactiveOpacity: 0.4, scale: 1.2, mode: "scale+color" },
    motion: { ...DEFAULT_SPEC.motion, lineIn: "fade-up", lineInMs: 120, wordPop: true, bounceScale: 0.1 },
  },

  neon_outline: {
    ...DEFAULT_SPEC,
    id: "neon_outline",
    name: "Neon Outline",
    category: "vibrant",
    styleFamily: "neon_glow",
    typography: { fontFamily: "Raleway", fontWeight: 800, fontSizePx: 80, letterSpacingPx: 2, lineHeight: 1.2, textTransform: "uppercase" },
    fill: { color: "transparent", opacity: 0 },
    stroke: { enabled: true, color: "#00FFFF", widthPx: 4, opacity: 1 },
    shadow: { enabled: true, color: "rgba(0,255,255,0.6)", blurPx: 24, offsetXPx: 0, offsetYPx: 0, opacity: 0.7 },
    highlight: { ...DEFAULT_SPEC.highlight, activeColor: "#00FFFF", inactiveOpacity: 0.25, scale: 1.1, mode: "scale+color" },
    motion: { ...DEFAULT_SPEC.motion, lineIn: "fade-in", lineInMs: 250, wordPop: false, glowPulse: true, bounceScale: 0 },
  },
};

interface RemotionPreviewProps {
  edl: EDL;
  watermark?: boolean;
  accentColor?: string;
  captionFontSize?: number;
}

export const RemotionPreview: React.FC<RemotionPreviewProps> = ({
  edl,
  watermark = false,
  accentColor = "#FBBF24",
  captionFontSize = 72,
}) => {
  const totalDurationInFrames = useMemo(() => {
    if (!edl.clips || edl.clips.length === 0) return 300;
    return edl.clips.reduce((sum: number, clip: { durationInFrames: number }) => sum + clip.durationInFrames, 0);
  }, [edl.clips]);

  const captionStyleSpec = useMemo<CaptionStyleSpec>(() => {
    const styleId = (edl as any).captionStyleId as string | undefined;
    return CAPTION_STYLE_MAP[styleId ?? "default"] ?? DEFAULT_SPEC;
  }, [(edl as any).captionStyleId]);

  const inputProps = useMemo(
    () => ({
      edl,
      watermark,
      accentColor,
      captionFontSize,
      captionStyleSpec,
    }),
    [edl, watermark, accentColor, captionFontSize, captionStyleSpec]
  );

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Player
        component={TikTokComposition}
        inputProps={inputProps}
        durationInFrames={Math.max(1, totalDurationInFrames)}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={edl.fps || 30}
        style={{
          width: "100%",
          maxHeight: "100%",
          aspectRatio: "9/16",
        }}
        controls
        loop
        autoPlay={false}
      />
    </div>
  );
};
