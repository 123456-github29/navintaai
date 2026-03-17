import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface LowerThirdProps {
  title?: string;
  subtitle?: string;
  showAt?: number; // seconds
  hideAt?: number; // seconds
  accentColor?: string;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  showAt = 1,
  hideAt = 5,
  accentColor = "#FF6B6B",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!title) return null;

  const showFrame = Math.round(showAt * fps);
  const hideFrame = Math.round(hideAt * fps);
  const localFrame = frame - showFrame;

  if (frame < showFrame || frame > hideFrame) return null;

  const durationFrames = hideFrame - showFrame;

  const slideIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 180, mass: 1 },
    durationInFrames: 20,
  });

  const slideOut = interpolate(
    localFrame,
    [durationFrames - 15, durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateX = interpolate(slideIn, [0, 1], [-300, 0]);
  const opacity = interpolate(slideOut, [0, 1], [1, 0]);
  const barWidth = interpolate(slideIn, [0, 1], [0, 100]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "18%",
        left: 40,
        right: 40,
        opacity,
        transform: `translateX(${translateX}px)`,
        zIndex: 15,
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: `${barWidth}%`,
          height: 4,
          background: accentColor,
          marginBottom: 8,
          borderRadius: 2,
          boxShadow: `0 0 10px ${accentColor}80`,
        }}
      />
      {/* Title */}
      <div
        style={{
          fontSize: 42,
          fontWeight: 800,
          color: "white",
          fontFamily: "'Arial Black', sans-serif",
          textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "Arial, sans-serif",
            marginTop: 4,
            textShadow: "1px 1px 4px rgba(0,0,0,0.8)",
            letterSpacing: "1px",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
