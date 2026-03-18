import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export type GradeLook =
  | "none"
  | "cinematic"
  | "vintage"
  | "warm"
  | "cool"
  | "dramatic"
  | "matte"
  | "neon"
  | "teal_orange";

export interface FilterSpec {
  type: string;
  value?: number;
  startTime?: number;
  endTime?: number;
}

// ----- CSS filter string builders -----

function buildDynamicFilter(filters: FilterSpec[], currentTime: number): string {
  let brightness = 1;
  let contrast = 1;
  let saturation = 1;
  let blur = 0;

  for (const f of filters) {
    const start = f.startTime ?? 0;
    const end = f.endTime ?? 999999;
    if (currentTime < start || currentTime > end) continue;

    const v = f.value ?? 1;
    switch (f.type) {
      case "brightness":
        brightness = Math.max(0, Math.min(3, v));
        break;
      case "contrast":
        contrast = Math.max(0, Math.min(4, v));
        break;
      case "saturation":
        saturation = Math.max(0, Math.min(4, v));
        break;
      case "blur":
        blur = Math.max(0, v * 5);
        break;
      case "vintage":
        brightness = 0.9;
        contrast = 1.1;
        saturation = 0.75;
        break;
      case "cinematic":
        contrast = 1.2;
        saturation = 0.85;
        brightness = 0.95;
        break;
      case "warm":
        saturation = 1.3;
        brightness = 1.05;
        break;
      case "cool":
        saturation = 0.9;
        brightness = 1.05;
        break;
    }
  }

  const parts = [
    `brightness(${brightness})`,
    `contrast(${contrast})`,
    `saturate(${saturation})`,
  ];
  if (blur > 0) parts.push(`blur(${blur}px)`);
  return parts.join(" ");
}

function getLookFilter(look: GradeLook): string {
  switch (look) {
    case "cinematic":
      return "contrast(1.15) saturate(0.85) brightness(0.95)";
    case "vintage":
      return "sepia(0.35) contrast(1.1) brightness(0.9) saturate(0.8)";
    case "warm":
      return "sepia(0.2) saturate(1.3) brightness(1.05) hue-rotate(-10deg)";
    case "cool":
      return "saturate(0.9) brightness(1.05) hue-rotate(15deg)";
    case "dramatic":
      return "contrast(1.4) saturate(0.7) brightness(0.9)";
    case "matte":
      return "contrast(0.9) saturate(0.8) brightness(1.1)";
    case "neon":
      return "saturate(2.5) contrast(1.3) brightness(1.1)";
    case "teal_orange":
      return "contrast(1.2) saturate(1.4) brightness(0.95) hue-rotate(5deg)";
    default:
      return "";
  }
}

// ----- Hook: call inside a Remotion component to get the video filter string -----

export function useVideoFilter(
  filters: FilterSpec[],
  look: GradeLook
): string {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const dynamic = filters.length > 0 ? buildDynamicFilter(filters, currentTime) : "";
  const lookFilter = getLookFilter(look);

  if (!dynamic && !lookFilter) return "";
  if (!dynamic) return lookFilter;
  if (!lookFilter) return dynamic;
  // Both: merge — apply dynamic on top of look
  return `${lookFilter} ${dynamic}`;
}

// ----- Vignette overlay (fine as an empty overlay — uses background gradient, not filter) -----

export const VignetteOverlay: React.FC<{ intensity?: number }> = ({
  intensity = 0.65,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${intensity}) 100%)`,
      pointerEvents: "none",
      zIndex: 3,
    }}
  />
);

// ----- Cinematic letterbox bars -----

export const CinematicBars: React.FC<{ visible?: boolean; barHeight?: number }> = ({
  visible = true,
  barHeight = 60,
}) => {
  if (!visible) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: barHeight,
          background: "#000",
          zIndex: 10,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: barHeight,
          background: "#000",
          zIndex: 10,
        }}
      />
    </>
  );
};
