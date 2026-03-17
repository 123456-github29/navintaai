import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";

interface FilmGrainProps {
  opacity?: number; // 0-1, default 0.04
  scale?: number;   // noise scale, default 8
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  opacity = 0.035,
  scale = 6,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Generate grain pattern
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const grainCanvas = React.useMemo(() => {
    const cols = Math.ceil(width / scale);
    const rows = Math.ceil(height / scale);
    const data: string[] = [];

    // Sample a grid of noise values and create SVG-based grain
    for (let y = 0; y < rows; y += 4) {
      for (let x = 0; x < cols; x += 4) {
        const n = noise2D("grain", x + frame * 0.5, y + frame * 0.3);
        const v = Math.round(((n + 1) / 2) * 255);
        if (Math.abs(n) > 0.6) {
          data.push(
            `<rect x="${x * scale}" y="${y * scale}" width="${scale * 4}" height="${scale * 4}" fill="rgba(${v},${v},${v},0.08)"/>`
          );
        }
      }
    }

    return data.join("");
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
      dangerouslySetInnerHTML={{
        __html: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">${grainCanvas}</svg>`,
      }}
    />
  );
};
