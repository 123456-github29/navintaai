import React from "react";
import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Popup } from "../types/edl";

interface EmojiPopupsProps {
  popups: Popup[];
  clipStartFrame?: number;
}

export const EmojiPopups: React.FC<EmojiPopupsProps> = ({ popups, clipStartFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      {popups.map((popup, index) => {
        const popupStartFrame = Math.round(popup.timeSec * fps) - clipStartFrame;
        const durationFrames = Math.round((popup.durationSec ?? 2) * fps);
        const popupEndFrame = popupStartFrame + durationFrames;

        if (frame < popupStartFrame || frame > popupEndFrame) return null;

        const scale = spring({
          fps,
          frame: frame - popupStartFrame,
          config: { damping: 10, stiffness: 150, mass: 0.8 },
        });

        const fadeOutStart = popupEndFrame - Math.round(fps * 0.4);
        const opacity = interpolate(
          frame,
          [fadeOutStart, popupEndFrame],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const posX = popup.positionX ?? 50;
        const posY = popup.positionY ?? 30;

        const bounce = interpolate(
          frame - popupStartFrame,
          [0, Math.round(fps * 0.3)],
          [-80, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={`popup-${index}`}
            style={{
              position: "absolute",
              left: `${posX}%`,
              top: `${posY}%`,
              fontSize: "120px",
              transform: `scale(${scale}) translateY(${bounce}px) translate(-50%, -50%)`,
              opacity,
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.5))",
            }}
          >
            {popup.emoji}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
