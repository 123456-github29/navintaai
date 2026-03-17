import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

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

interface FilterSpec {
  type: string;
  value?: number;
  startTime?: number;
  endTime?: number;
}

interface ColorGradeProps {
  filters: FilterSpec[];
  totalDuration: number; // seconds
  look?: GradeLook;
}

function buildCssFilter(
  filters: FilterSpec[],
  currentTime: number
): string {
  const parts: string[] = [];

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
      case "sharpen":
        // Sharpen not directly available as CSS, skip for CSS approach
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
        // Warm look: slightly orange tint via sepia
        break;
      case "cool":
        // Cool look: blue tint via hue-rotate
        break;
    }
  }

  parts.push(`brightness(${brightness})`);
  parts.push(`contrast(${contrast})`);
  parts.push(`saturate(${saturation})`);
  if (blur > 0) parts.push(`blur(${blur}px)`);

  return parts.join(" ");
}

function getLookStyle(look: GradeLook): React.CSSProperties {
  switch (look) {
    case "cinematic":
      return {
        filter:
          "contrast(1.15) saturate(0.85) brightness(0.95)",
        mixBlendMode: "normal",
      };
    case "vintage":
      return {
        filter: "sepia(0.35) contrast(1.1) brightness(0.9) saturate(0.8)",
      };
    case "warm":
      return {
        filter: "sepia(0.2) saturate(1.3) brightness(1.05) hue-rotate(-10deg)",
      };
    case "cool":
      return {
        filter: "saturate(0.9) brightness(1.05) hue-rotate(15deg)",
      };
    case "dramatic":
      return {
        filter: "contrast(1.4) saturate(0.7) brightness(0.9)",
      };
    case "matte":
      return {
        filter: "contrast(0.9) saturate(0.8) brightness(1.1)",
      };
    case "neon":
      return {
        filter: "saturate(2.5) contrast(1.3) brightness(1.1)",
      };
    case "teal_orange":
      // Teal & Orange grade - Hollywood blockbuster look
      return {
        filter: "contrast(1.2) saturate(1.4) brightness(0.95) hue-rotate(5deg)",
      };
    default:
      return {};
  }
}

export const ColorGradeOverlay: React.FC<ColorGradeProps> = ({
  filters,
  totalDuration,
  look = "none",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const dynamicFilter = buildCssFilter(filters || [], currentTime);
  const lookStyle = getLookStyle(look);

  // Vignette overlay for cinematic look
  const showVignette = look === "cinematic" || look === "dramatic" || look === "teal_orange";

  return (
    <>
      {/* Dynamic filter layer */}
      {filters && filters.length > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            filter: dynamicFilter,
            pointerEvents: "none",
            zIndex: 2,
            ...lookStyle,
          }}
        />
      )}

      {/* Vignette */}
      {showVignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      )}
    </>
  );
};

// Cinematic letterbox bars (16:9 look inside 9:16 canvas)
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
