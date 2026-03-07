import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

interface WatermarkOverlayProps {
  enabled: boolean;
  text?: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  enabled,
  text = "Navinta AI",
}) => {
  const { width, height } = useVideoConfig();

  if (!enabled) return null;

  const fontSize = Math.max(16, Math.round(width * 0.025));

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 200 }}>
      <div
        style={{
          position: "absolute",
          bottom: "4%",
          right: "4%",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize,
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.35)",
          letterSpacing: "0.05em",
          textShadow: "0 1px 4px rgba(0,0,0,0.3)",
          userSelect: "none",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
