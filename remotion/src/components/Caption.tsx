import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

export type CaptionStyle =
  | "default"
  | "boxed"
  | "gradient"
  | "highlighted"
  | "outline"
  | "cinematic"
  | "viral"
  | "neon";

export interface CaptionSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
  style?: CaptionStyle;
  position?: "top" | "bottom" | "center";
  baseTextColor?: string;
  outlineColor?: string;
  background?: string;
  font?: string;
}

interface CaptionProps {
  segments: CaptionSegment[];
}

function WordHighlightCaption({
  text,
  progress,
  style,
  baseTextColor,
  outlineColor,
}: {
  text: string;
  progress: number; // 0-1
  style: CaptionStyle;
  baseTextColor: string;
  outlineColor: string;
}) {
  // Memoize word split — only recomputes when text changes, not on every frame
  const words = useMemo(() => text.split(" "), [text]);

  if (style === "viral" || style === "highlighted") {
    // Word-by-word highlight (CapCut style)
    const activeWordIndex = Math.floor(progress * words.length);
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        {words.map((word, i) => {
          const isActive = i === activeWordIndex;
          const isPast = i < activeWordIndex;
          return (
            <span
              key={i}
              style={{
                fontSize: 52,
                fontWeight: 900,
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                color: isActive ? "#FFD700" : isPast ? "rgba(255,255,255,0.6)" : "white",
                textShadow: isActive
                  ? "0 0 20px rgba(255,215,0,0.8), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000"
                  : "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
                transform: isActive ? "scale(1.15)" : "scale(1)",
                transition: "all 0.1s ease",
                display: "inline-block",
                letterSpacing: "1px",
                padding: "2px 4px",
                background: isActive ? "rgba(255,215,0,0.15)" : "transparent",
                borderRadius: 4,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  }

  if (style === "neon") {
    return (
      <span
        style={{
          fontSize: 52,
          fontWeight: 800,
          fontFamily: "'Arial Black', sans-serif",
          color: "#00FFFF",
          textShadow:
            "0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF, 0 0 80px #0080FF",
          letterSpacing: "2px",
        }}
      >
        {text}
      </span>
    );
  }

  // Default: full text
  return (
    <span
      style={{
        fontSize: 52,
        fontWeight: 800,
        fontFamily: "'Arial Black', 'Impact', sans-serif",
        color: baseTextColor || "white",
        textShadow:
          style === "outline"
            ? `3px 3px 0 ${outlineColor || "#000"}, -3px -3px 0 ${outlineColor || "#000"}, 3px -3px 0 ${outlineColor || "#000"}, -3px 3px 0 ${outlineColor || "#000"}, 0 0 15px rgba(0,0,0,0.5)`
            : `2px 2px 8px rgba(0,0,0,0.9), -1px -1px 4px rgba(0,0,0,0.8)`,
        letterSpacing: "0.5px",
      }}
    >
      {text}
    </span>
  );
}

function SingleCaption({ segment }: { segment: CaptionSegment }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(segment.start * fps);
  const endFrame = Math.round(segment.end * fps);
  const localFrame = frame - startFrame;
  const segmentFrames = endFrame - startFrame;

  if (frame < startFrame || frame >= endFrame) return null;

  const progress = Math.min(1, Math.max(0, localFrame / segmentFrames));

  // Entrance animation (slide up)
  const enterDuration = Math.min(8, segmentFrames * 0.15);
  const exitDuration = Math.min(6, segmentFrames * 0.1);

  const slideY = spring({
    frame: localFrame,
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.8 },
    durationInFrames: enterDuration,
  });

  const opacity = interpolate(
    localFrame,
    [0, enterDuration, segmentFrames - exitDuration, segmentFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const translateY = interpolate(slideY, [0, 1], [20, 0]);

  const style = segment.style || "default";
  const position = segment.position || "bottom";
  const baseTextColor = segment.baseTextColor || "white";
  const outlineColor = segment.outlineColor || "#000000";

  const yPos =
    position === "top" ? "10%" : position === "center" ? "45%" : "78%";

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: "5%",
    right: "5%",
    top: yPos,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    opacity,
    transform: `translateY(${translateY}px)`,
  };

  const getBackground = () => {
    if (style === "boxed") return "rgba(0,0,0,0.75)";
    if (style === "cinematic") return "rgba(0,0,0,0.6)";
    if (style === "gradient")
      return "linear-gradient(135deg, rgba(255,107,107,0.85), rgba(78,84,200,0.85))";
    return "transparent";
  };

  const getPadding = () => {
    if (style === "boxed" || style === "cinematic" || style === "gradient")
      return "12px 20px";
    return "0";
  };

  const getBorderRadius = () => {
    if (style === "boxed" || style === "cinematic") return 12;
    if (style === "gradient") return 50;
    return 0;
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          background: getBackground(),
          padding: getPadding(),
          borderRadius: getBorderRadius(),
          textAlign: "center",
          backdropFilter: style === "cinematic" ? "blur(4px)" : undefined,
          border:
            style === "cinematic" ? "1px solid rgba(255,255,255,0.2)" : "none",
          boxShadow:
            style === "boxed" || style === "cinematic"
              ? "0 4px 20px rgba(0,0,0,0.4)"
              : undefined,
        }}
      >
        <WordHighlightCaption
          text={segment.text}
          progress={progress}
          style={style}
          baseTextColor={baseTextColor}
          outlineColor={outlineColor}
        />
      </div>
    </div>
  );
}

export const CaptionLayer: React.FC<CaptionProps> = ({ segments }) => {
  if (!segments || segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, i) => (
        <SingleCaption key={i} segment={seg} />
      ))}
    </>
  );
};
