import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface FilmGrainProps {
  opacity?: number; // 0-1
  scale?: number;   // noise cell size in pixels
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  opacity = 0.035,
  scale = 6,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Film grain must animate per-frame — compute new noise pattern each frame.
  // useMemo here only prevents recalculation when frame/dimensions haven't changed.
  const svgContent = React.useMemo(() => {
    const cols = Math.ceil(width / scale);
    const rows = Math.ceil(height / scale);
    const rects: string[] = [];

    for (let y = 0; y < rows; y += 4) {
      for (let x = 0; x < cols; x += 4) {
        const n = noise2D("grain", x + frame * 0.5, y + frame * 0.3);
        if (Math.abs(n) > 0.6) {
          const v = Math.round(((n + 1) / 2) * 255);
          rects.push(
            `<rect x="${x * scale}" y="${y * scale}" width="${scale * 4}" height="${scale * 4}" fill="rgba(${v},${v},${v},0.08)"/>`
          );
        }
      }
    }

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">${rects.join("")}</svg>`;
  }, [frame, width, height, scale]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        pointerEvents: "none",
        zIndex: 5,
        mixBlendMode: "overlay",
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
