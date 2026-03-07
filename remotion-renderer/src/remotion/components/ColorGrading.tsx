import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { ColorGradePreset } from "../types/edl";

interface ColorGradingProps {
  preset: ColorGradePreset;
  filmGrain?: boolean;
  vignette?: boolean;
}

const GRADE_FILTERS: Record<ColorGradePreset, string> = {
  none: "none",
  cinematic: "contrast(1.1) saturate(0.85) sepia(0.1) brightness(1.02)",
  vintage: "contrast(0.95) saturate(0.7) sepia(0.2) brightness(1.05)",
  moody: "contrast(1.2) saturate(0.8) brightness(0.9) hue-rotate(-10deg)",
  vibrant: "contrast(1.05) saturate(1.3) brightness(1.02)",
  pastel: "contrast(0.9) saturate(0.6) brightness(1.1)",
};

function seededGrain(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const FilmGrainOverlay: React.FC = () => {
  const frame = useCurrentFrame();

  const grainOpacity = interpolate(
    seededGrain(frame * 3.7),
    [0, 1],
    [0.02, 0.06]
  );

  const offsetX = seededGrain(frame * 7.1) * 100;
  const offsetY = seededGrain(frame * 11.3) * 100;

  return (
    <AbsoluteFill
      style={{
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundPosition: `${offsetX}% ${offsetY}%`,
        opacity: grainOpacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

const VignetteOverlay: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
        pointerEvents: "none",
      }}
    />
  );
};

export const ColorGrading: React.FC<ColorGradingProps> = ({
  preset,
  filmGrain = false,
  vignette = false,
}) => {
  const filterValue = useMemo(() => GRADE_FILTERS[preset] || "none", [preset]);

  if (preset === "none" && !filmGrain && !vignette) return null;

  return (
    <>
      {filterValue !== "none" && (
        <AbsoluteFill
          style={{
            filter: filterValue,
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            zIndex: 50,
            mixBlendMode: "normal",
          }}
        />
      )}
      {filmGrain && <FilmGrainOverlay />}
      {vignette && <VignetteOverlay />}
    </>
  );
};
