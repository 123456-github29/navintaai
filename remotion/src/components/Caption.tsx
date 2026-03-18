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

// ─── Style preset definitions ─────────────────────────────────────────────

interface StylePreset {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textTransform?: "uppercase" | "lowercase" | "none";
  letterSpacing?: string;
  color: string;
  activeColor?: string; // for word-highlight styles
  inactiveColor?: string;
  textShadow: string;
  activeTextShadow?: string;
  background: string;
  padding: string;
  borderRadius: number;
  backdropFilter?: string;
  border?: string;
  boxShadow?: string;
  highlightMode: "word" | "full" | "karaoke";
  wordBackground?: string;
  activeWordBackground?: string;
}

const STYLE_PRESETS: Record<CaptionStyle, StylePreset> = {
  default: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 48,
    fontWeight: 800,
    color: "white",
    textShadow: "2px 2px 8px rgba(0,0,0,0.9), -1px -1px 4px rgba(0,0,0,0.8)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  viral: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 52,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "white",
    activeColor: "#FFD700",
    inactiveColor: "rgba(255,255,255,0.6)",
    textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
    activeTextShadow: "0 0 20px rgba(255,215,0,0.8), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "word",
    activeWordBackground: "rgba(255,215,0,0.15)",
  },
  highlighted: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 52,
    fontWeight: 900,
    color: "white",
    activeColor: "#FFD700",
    inactiveColor: "rgba(255,255,255,0.6)",
    textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
    activeTextShadow: "0 0 20px rgba(255,215,0,0.8), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "word",
    activeWordBackground: "rgba(255,215,0,0.15)",
  },
  boxed: {
    fontFamily: "'Arial Black', sans-serif",
    fontSize: 48,
    fontWeight: 800,
    color: "white",
    textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
    background: "rgba(0,0,0,0.75)",
    padding: "12px 20px",
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    highlightMode: "full",
  },
  cinematic: {
    fontFamily: "'Arial Black', sans-serif",
    fontSize: 46,
    fontWeight: 700,
    letterSpacing: "1px",
    color: "white",
    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
    background: "rgba(0,0,0,0.6)",
    padding: "14px 24px",
    borderRadius: 12,
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    highlightMode: "full",
  },
  neon: {
    fontFamily: "'Arial Black', sans-serif",
    fontSize: 50,
    fontWeight: 800,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "#00FFFF",
    textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF, 0 0 80px #0080FF",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  gradient: {
    fontFamily: "'Arial Black', sans-serif",
    fontSize: 48,
    fontWeight: 800,
    color: "white",
    textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
    background: "linear-gradient(135deg, rgba(255,107,107,0.85), rgba(78,84,200,0.85))",
    padding: "12px 24px",
    borderRadius: 50,
    highlightMode: "full",
  },
  outline: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 56,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "white",
    textShadow: "3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 0 15px rgba(0,0,0,0.5)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  bold: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 60,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "white",
    activeColor: "#FF3366",
    inactiveColor: "rgba(255,255,255,0.5)",
    textShadow: "4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000",
    activeTextShadow: "4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 0 0 30px rgba(255,51,102,0.6)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "word",
    activeWordBackground: "rgba(255,51,102,0.2)",
  },
  typewriter: {
    fontFamily: "'Courier New', 'Courier', monospace",
    fontSize: 42,
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#00FF00",
    textShadow: "0 0 10px rgba(0,255,0,0.5), 2px 2px 4px rgba(0,0,0,0.8)",
    background: "rgba(0,0,0,0.85)",
    padding: "14px 20px",
    borderRadius: 4,
    border: "1px solid rgba(0,255,0,0.3)",
    highlightMode: "full",
  },
  retro: {
    fontFamily: "'Impact', 'Arial Black', sans-serif",
    fontSize: 54,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "3px",
    color: "#FF6B35",
    textShadow: "3px 3px 0 #FF2D00, 6px 6px 0 rgba(0,0,0,0.3)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  minimal: {
    fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
    fontSize: 36,
    fontWeight: 500,
    letterSpacing: "0.5px",
    color: "rgba(255,255,255,0.9)",
    textShadow: "0 1px 8px rgba(0,0,0,0.6)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  fire: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 54,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#FF4500",
    activeColor: "#FFD700",
    inactiveColor: "#FF6347",
    textShadow: "0 0 20px rgba(255,69,0,0.8), 0 0 40px rgba(255,165,0,0.4), 3px 3px 0 #8B0000",
    activeTextShadow: "0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,165,0,0.6), 3px 3px 0 #8B0000",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "word",
    activeWordBackground: "rgba(255,69,0,0.2)",
  },
  glitch: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 52,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "3px",
    color: "white",
    textShadow: "2px 0 #FF0000, -2px 0 #00FFFF",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  karaoke: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 50,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.4)",
    activeColor: "#FFFFFF",
    textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "karaoke",
  },
  shadow: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 54,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "white",
    textShadow: "4px 4px 0 rgba(0,0,0,0.8), 8px 8px 0 rgba(0,0,0,0.4), 12px 12px 20px rgba(0,0,0,0.3)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  comic: {
    fontFamily: "'Impact', 'Arial Black', sans-serif",
    fontSize: 52,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "#FFFF00",
    textShadow: "3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
    background: "rgba(255,0,0,0.85)",
    padding: "10px 20px",
    borderRadius: 8,
    border: "4px solid #000",
    boxShadow: "4px 4px 0 #000",
    highlightMode: "full",
  },
  elegant: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: 44,
    fontWeight: 400,
    letterSpacing: "2px",
    color: "rgba(255,255,255,0.95)",
    textShadow: "0 2px 15px rgba(0,0,0,0.7)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "full",
  },
  broadcast: {
    fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
    fontSize: 40,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: "white",
    textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
    background: "linear-gradient(90deg, rgba(200,0,0,0.9) 0%, rgba(200,0,0,0.9) 85%, transparent 100%)",
    padding: "10px 24px 10px 16px",
    borderRadius: 0,
    highlightMode: "full",
  },
  wave: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 50,
    fontWeight: 900,
    color: "#E040FB",
    activeColor: "#00E5FF",
    inactiveColor: "#E040FB",
    textShadow: "0 0 15px rgba(224,64,251,0.6), 2px 2px 0 #000, -2px -2px 0 #000",
    activeTextShadow: "0 0 20px rgba(0,229,255,0.8), 2px 2px 0 #000, -2px -2px 0 #000",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "word",
    activeWordBackground: "rgba(0,229,255,0.15)",
  },
  stack: {
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    fontSize: 58,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "white",
    activeColor: "#00FF88",
    inactiveColor: "rgba(255,255,255,0.5)",
    textShadow: "3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000",
    activeTextShadow: "3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 0 25px rgba(0,255,136,0.5)",
    background: "transparent",
    padding: "0",
    borderRadius: 0,
    highlightMode: "word",
    activeWordBackground: "rgba(0,255,136,0.15)",
  },
};

// ─── Word-level rendering ─────────────────────────────────────────────────

function WordHighlightCaption({
  text,
  progress,
  style,
  frame,
  fps,
}: {
  text: string;
  progress: number; // 0-1
  style: CaptionStyle;
  frame: number;
  fps: number;
}) {
  const words = useMemo(() => text.split(" "), [text]);
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.default;

  // ── Glitch: animated offset per frame ──
  if (style === "glitch") {
    const glitchX = Math.sin(frame * 0.7) * 3;
    const glitchY = Math.cos(frame * 0.5) * 2;
    return (
      <span
        style={{
          fontSize: preset.fontSize,
          fontWeight: preset.fontWeight,
          fontFamily: preset.fontFamily,
          color: preset.color,
          textTransform: preset.textTransform,
          letterSpacing: preset.letterSpacing,
          textShadow: `${2 + glitchX}px ${glitchY}px #FF0000, ${-2 + glitchX}px ${-glitchY}px #00FFFF`,
          display: "inline-block",
        }}
      >
        {text}
      </span>
    );
  }

  // ── Karaoke: progressive fill ──
  if (preset.highlightMode === "karaoke") {
    const fillPercent = Math.min(100, Math.max(0, progress * 100));
    return (
      <span
        style={{
          fontSize: preset.fontSize,
          fontWeight: preset.fontWeight,
          fontFamily: preset.fontFamily,
          textTransform: preset.textTransform,
          letterSpacing: preset.letterSpacing,
          backgroundImage: `linear-gradient(90deg, ${preset.activeColor || "white"} ${fillPercent}%, ${preset.color} ${fillPercent}%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textShadow: "none",
          filter: `drop-shadow(2px 2px 0 #000) drop-shadow(-2px -2px 0 #000)`,
        }}
      >
        {text}
      </span>
    );
  }

  // ── Word-by-word highlight ──
  if (preset.highlightMode === "word") {
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

          let color = preset.color;
          if (isActive) color = preset.activeColor || preset.color;
          else if (isPast) color = preset.inactiveColor || preset.color;

          return (
            <span
              key={i}
              style={{
                fontSize: preset.fontSize,
                fontWeight: preset.fontWeight,
                fontFamily: preset.fontFamily,
                textTransform: preset.textTransform,
                letterSpacing: preset.letterSpacing,
                color,
                textShadow: isActive
                  ? (preset.activeTextShadow || preset.textShadow)
                  : preset.textShadow,
                transform: isActive ? "scale(1.15)" : "scale(1)",
                transition: "all 0.1s ease",
                display: "inline-block",
                padding: "2px 4px",
                background: isActive
                  ? (preset.activeWordBackground || "transparent")
                  : "transparent",
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

  // ── Full text (no word highlight) ──
  return (
    <span
      style={{
        fontSize: preset.fontSize,
        fontWeight: preset.fontWeight,
        fontFamily: preset.fontFamily,
        color: preset.color,
        textShadow: preset.textShadow,
        textTransform: preset.textTransform,
        letterSpacing: preset.letterSpacing,
      }}
    >
      {text}
    </span>
  );
}

// ─── Single caption segment ──────────────────────────────────────────────

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
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.default;

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

  return (
    <div style={containerStyle}>
      <div
        style={{
          background: preset.background,
          padding: preset.padding,
          borderRadius: preset.borderRadius,
          textAlign: "center",
          backdropFilter: preset.backdropFilter,
          border: preset.border || "none",
          boxShadow: preset.boxShadow,
        }}
      >
        <WordHighlightCaption
          text={segment.text}
          progress={progress}
          style={style}
          frame={frame}
          fps={fps}
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
