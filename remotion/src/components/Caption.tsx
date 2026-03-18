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
  | "neon"
  | "bold"
  | "typewriter"
  | "retro"
  | "minimal"
  | "fire"
  | "glitch"
  | "karaoke"
  | "shadow"
  | "comic"
  | "elegant"
  | "broadcast"
  | "wave"
  | "stack";

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
  frame,
}: {
  text: string;
  progress: number; // 0-1
  style: CaptionStyle;
  baseTextColor: string;
  outlineColor: string;
  frame: number;
}) {
  // Memoize word split — only recomputes when text changes, not on every frame
  const words = useMemo(() => text.split(" "), [text]);

  // ── Word-by-word highlight styles ──
  if (style === "viral" || style === "highlighted") {
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

  // ── Bold: large pink word-by-word highlight ──
  if (style === "bold") {
    const activeWordIndex = Math.floor(progress * words.length);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
        {words.map((word, i) => {
          const isActive = i === activeWordIndex;
          const isPast = i < activeWordIndex;
          return (
            <span
              key={i}
              style={{
                fontSize: 60,
                fontWeight: 900,
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                textTransform: "uppercase" as const,
                color: isActive ? "#FF3366" : isPast ? "rgba(255,255,255,0.5)" : "white",
                textShadow: isActive
                  ? "4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 0 0 30px rgba(255,51,102,0.6)"
                  : "4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000",
                transform: isActive ? "scale(1.15)" : "scale(1)",
                display: "inline-block",
                padding: "2px 4px",
                background: isActive ? "rgba(255,51,102,0.2)" : "transparent",
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

  // ── Fire: orange/red word-by-word with flame glow ──
  if (style === "fire") {
    const activeWordIndex = Math.floor(progress * words.length);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
        {words.map((word, i) => {
          const isActive = i === activeWordIndex;
          const isPast = i < activeWordIndex;
          return (
            <span
              key={i}
              style={{
                fontSize: 54,
                fontWeight: 900,
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                textTransform: "uppercase" as const,
                color: isActive ? "#FFD700" : isPast ? "#FF6347" : "#FF4500",
                textShadow: isActive
                  ? "0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,165,0,0.6), 3px 3px 0 #8B0000"
                  : "0 0 20px rgba(255,69,0,0.8), 0 0 40px rgba(255,165,0,0.4), 3px 3px 0 #8B0000",
                transform: isActive ? "scale(1.15)" : "scale(1)",
                display: "inline-block",
                padding: "2px 4px",
                background: isActive ? "rgba(255,69,0,0.2)" : "transparent",
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

  // ── Wave: purple/cyan shifting word highlight ──
  if (style === "wave") {
    const activeWordIndex = Math.floor(progress * words.length);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
        {words.map((word, i) => {
          const isActive = i === activeWordIndex;
          const isPast = i < activeWordIndex;
          return (
            <span
              key={i}
              style={{
                fontSize: 50,
                fontWeight: 900,
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                color: isActive ? "#00E5FF" : isPast ? "#E040FB" : "#E040FB",
                textShadow: isActive
                  ? "0 0 20px rgba(0,229,255,0.8), 2px 2px 0 #000, -2px -2px 0 #000"
                  : "0 0 15px rgba(224,64,251,0.6), 2px 2px 0 #000, -2px -2px 0 #000",
                transform: isActive ? "scale(1.15)" : "scale(1)",
                display: "inline-block",
                padding: "2px 4px",
                background: isActive ? "rgba(0,229,255,0.15)" : "transparent",
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

  // ── Stack: large green word-by-word highlight ──
  if (style === "stack") {
    const activeWordIndex = Math.floor(progress * words.length);
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
        {words.map((word, i) => {
          const isActive = i === activeWordIndex;
          const isPast = i < activeWordIndex;
          return (
            <span
              key={i}
              style={{
                fontSize: 58,
                fontWeight: 900,
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                textTransform: "uppercase" as const,
                color: isActive ? "#00FF88" : isPast ? "rgba(255,255,255,0.5)" : "white",
                textShadow: isActive
                  ? "3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 0 25px rgba(0,255,136,0.5)"
                  : "3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000",
                transform: isActive ? "scale(1.15)" : "scale(1)",
                display: "inline-block",
                padding: "2px 4px",
                background: isActive ? "rgba(0,255,136,0.15)" : "transparent",
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

  // ── Glitch: RGB-split with animated offset ──
  if (style === "glitch") {
    const glitchX = Math.sin(frame * 0.7) * 3;
    const glitchY = Math.cos(frame * 0.5) * 2;
    return (
      <span
        style={{
          fontSize: 52,
          fontWeight: 900,
          fontFamily: "'Arial Black', 'Impact', sans-serif",
          color: "white",
          textTransform: "uppercase" as const,
          letterSpacing: "3px",
          textShadow: `${2 + glitchX}px ${glitchY}px #FF0000, ${-2 + glitchX}px ${-glitchY}px #00FFFF`,
          display: "inline-block",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Karaoke: progressive fill ──
  if (style === "karaoke") {
    const fillPercent = Math.min(100, Math.max(0, progress * 100));
    return (
      <span
        style={{
          fontSize: 50,
          fontWeight: 900,
          fontFamily: "'Arial Black', 'Impact', sans-serif",
          textTransform: "uppercase" as const,
          backgroundImage: `linear-gradient(90deg, #FFFFFF ${fillPercent}%, rgba(255,255,255,0.4) ${fillPercent}%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textShadow: "none",
          filter: "drop-shadow(2px 2px 0 #000) drop-shadow(-2px -2px 0 #000)",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Typewriter: green monospace on dark background ──
  if (style === "typewriter") {
    return (
      <span
        style={{
          fontSize: 42,
          fontWeight: 700,
          fontFamily: "'Courier New', 'Courier', monospace",
          color: "#00FF00",
          textShadow: "0 0 10px rgba(0,255,0,0.5), 2px 2px 4px rgba(0,0,0,0.8)",
          letterSpacing: "2px",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Retro: orange 80s style with 3D shadow ──
  if (style === "retro") {
    return (
      <span
        style={{
          fontSize: 54,
          fontWeight: 900,
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          color: "#FF6B35",
          textTransform: "uppercase" as const,
          letterSpacing: "3px",
          textShadow: "3px 3px 0 #FF2D00, 6px 6px 0 rgba(0,0,0,0.3)",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Minimal: small, subtle, clean ──
  if (style === "minimal") {
    return (
      <span
        style={{
          fontSize: 36,
          fontWeight: 500,
          fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 1px 8px rgba(0,0,0,0.6)",
          letterSpacing: "0.5px",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Shadow: dramatic multi-layer drop shadow ──
  if (style === "shadow") {
    return (
      <span
        style={{
          fontSize: 54,
          fontWeight: 900,
          fontFamily: "'Arial Black', 'Impact', sans-serif",
          color: "white",
          textTransform: "uppercase" as const,
          textShadow: "4px 4px 0 rgba(0,0,0,0.8), 8px 8px 0 rgba(0,0,0,0.4), 12px 12px 20px rgba(0,0,0,0.3)",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Comic: yellow text (background handled by container) ──
  if (style === "comic") {
    return (
      <span
        style={{
          fontSize: 52,
          fontWeight: 900,
          fontFamily: "'Impact', 'Arial Black', sans-serif",
          color: "#FFFF00",
          textTransform: "uppercase" as const,
          letterSpacing: "1px",
          textShadow: "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Elegant: serif, refined ──
  if (style === "elegant") {
    return (
      <span
        style={{
          fontSize: 44,
          fontWeight: 400,
          fontFamily: "'Georgia', 'Times New Roman', serif",
          color: "rgba(255,255,255,0.95)",
          textShadow: "0 2px 15px rgba(0,0,0,0.7)",
          letterSpacing: "2px",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Broadcast: news/TV bar (background handled by container) ──
  if (style === "broadcast") {
    return (
      <span
        style={{
          fontSize: 40,
          fontWeight: 700,
          fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
          color: "white",
          textTransform: "uppercase" as const,
          letterSpacing: "1px",
          textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        {text}
      </span>
    );
  }

  // Default: full text (also handles "outline", "default", and any unknown style)
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
    if (style === "typewriter") return "rgba(0,0,0,0.85)";
    if (style === "comic") return "rgba(255,0,0,0.85)";
    if (style === "broadcast")
      return "linear-gradient(90deg, rgba(200,0,0,0.9) 0%, rgba(200,0,0,0.9) 85%, transparent 100%)";
    return "transparent";
  };

  const getPadding = () => {
    if (style === "boxed" || style === "cinematic" || style === "gradient")
      return "12px 20px";
    if (style === "typewriter") return "14px 20px";
    if (style === "comic") return "10px 20px";
    if (style === "broadcast") return "10px 24px 10px 16px";
    return "0";
  };

  const getBorderRadius = () => {
    if (style === "boxed" || style === "cinematic") return 12;
    if (style === "gradient") return 50;
    if (style === "typewriter") return 4;
    if (style === "comic") return 8;
    if (style === "broadcast") return 0;
    return 0;
  };

  const getBorder = () => {
    if (style === "cinematic") return "1px solid rgba(255,255,255,0.2)";
    if (style === "typewriter") return "1px solid rgba(0,255,0,0.3)";
    if (style === "comic") return "4px solid #000";
    return "none";
  };

  const getBoxShadow = () => {
    if (style === "boxed" || style === "cinematic") return "0 4px 20px rgba(0,0,0,0.4)";
    if (style === "comic") return "4px 4px 0 #000";
    return undefined;
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
          border: getBorder(),
          boxShadow: getBoxShadow(),
        }}
      >
        <WordHighlightCaption
          text={segment.text}
          progress={progress}
          style={style}
          baseTextColor={baseTextColor}
          outlineColor={outlineColor}
          frame={frame}
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
