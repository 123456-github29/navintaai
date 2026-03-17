import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  Easing,
} from "remotion";

export interface TransitionSpec {
  type: "fade" | "dissolve" | "wipe" | "zoom" | "flash" | "glitch";
  timestamp: number; // seconds
  duration: number;  // seconds
}

function FadeTransition({
  durationFrames,
  color = "black",
}: {
  durationFrames: number;
  color?: string;
}) {
  const frame = useCurrentFrame();

  const half = durationFrames / 2;
  const opacity = interpolate(
    frame,
    [0, half - 1, half, durationFrames - 1],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    }
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: color,
        opacity,
        zIndex: 20,
      }}
    />
  );
}

function FlashTransition({ durationFrames }: { durationFrames: number }) {
  const frame = useCurrentFrame();
  const half = durationFrames / 4;

  const opacity = interpolate(
    frame,
    [0, half, durationFrames],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "white",
        opacity,
        zIndex: 20,
      }}
    />
  );
}

function ZoomTransition({ durationFrames }: { durationFrames: number }) {
  const frame = useCurrentFrame();

  const scale = interpolate(
    frame,
    [0, durationFrames],
    [1, 1.15],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    }
  );

  const opacity = interpolate(
    frame,
    [0, durationFrames * 0.3, durationFrames * 0.7, durationFrames],
    [0, 0.3, 0.3, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        opacity,
        zIndex: 20,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    />
  );
}

function GlitchTransition({ durationFrames }: { durationFrames: number }) {
  const frame = useCurrentFrame();
  const phase = Math.floor((frame / durationFrames) * 8);

  const opacity = interpolate(
    frame,
    [0, durationFrames * 0.3, durationFrames * 0.7, durationFrames],
    [0, 0.6, 0.6, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateX = (phase % 2 === 0 ? 1 : -1) * (phase % 4) * 5;
  const hueRotate = phase * 30;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `rgba(${phase % 2 === 0 ? "255,0,0" : "0,0,255"},0.15)`,
        opacity,
        zIndex: 20,
        transform: `translateX(${translateX}px)`,
        filter: `hue-rotate(${hueRotate}deg)`,
        mixBlendMode: "screen",
      }}
    />
  );
}

export const TransitionLayer: React.FC<{ transitions: TransitionSpec[] }> = ({
  transitions,
}) => {
  const { fps } = useVideoConfig();

  if (!transitions || transitions.length === 0) return null;

  return (
    <>
      {transitions.map((t, i) => {
        const startFrame = Math.round(t.timestamp * fps);
        const durationFrames = Math.round(t.duration * fps);

        return (
          <Sequence key={i} from={startFrame} durationInFrames={durationFrames}>
            {(t.type === "fade" || t.type === "dissolve") && (
              <FadeTransition durationFrames={durationFrames} />
            )}
            {t.type === "flash" && (
              <FlashTransition durationFrames={durationFrames} />
            )}
            {t.type === "zoom" && (
              <ZoomTransition durationFrames={durationFrames} />
            )}
            {t.type === "glitch" && (
              <GlitchTransition durationFrames={durationFrames} />
            )}
            {t.type === "wipe" && (
              <FadeTransition durationFrames={durationFrames} color="rgba(0,0,0,0.8)" />
            )}
          </Sequence>
        );
      })}
    </>
  );
};
