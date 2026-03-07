import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { captionStylePacks } from "../styles/presets";
import type { CaptionStylePack } from "../styles/presets";
import type { CaptionSegment, WordTiming } from "../../schemas/editDecision.schema";

interface CaptionTrackProps {
  captions: CaptionSegment[];
}

interface WordInfo {
  text: string;
  startFrame: number;
  endFrame: number;
}

function buildStrokeShadow(color: string, width: number): string {
  if (width <= 0 || color === "transparent") return "";
  const w = width;
  return [
    `${w}px 0 0 ${color}`,
    `${-w}px 0 0 ${color}`,
    `0 ${w}px 0 ${color}`,
    `0 ${-w}px 0 ${color}`,
    `${w}px ${w}px 0 ${color}`,
    `${-w}px ${w}px 0 ${color}`,
    `${w}px ${-w}px 0 ${color}`,
    `${-w}px ${-w}px 0 ${color}`,
  ].join(", ");
}

function getPositionStyle(position?: string, safeMargin?: number): React.CSSProperties {
  const margin = safeMargin ?? 12;
  switch (position) {
    case "top":
      return { top: `${margin}%`, bottom: "auto" };
    case "middle":
      return { top: "50%", bottom: "auto", transform: "translate(-50%, -50%)" };
    case "bottom":
    default:
      return { bottom: `${margin}%`, top: "auto" };
  }
}

function getBackgroundStyle(style: CaptionStylePack): React.CSSProperties {
  switch (style.backgroundMode) {
    case "pill":
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: 24,
        padding: "8px 20px",
      };
    case "box":
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: 8,
        padding: "8px 16px",
      };
    case "glass":
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: 24,
        padding: "8px 20px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      };
    case "none":
    default:
      return {
        backgroundColor: "transparent",
        padding: "8px 16px",
      };
  }
}

function getWordTimings(caption: CaptionSegment): WordInfo[] {
  const textWords = caption.text.split(/\s+/).filter(Boolean);
  if (!textWords.length) return [];

  if (caption.words && caption.words.length > 0) {
    return caption.words.map((w: WordTiming) => ({
      text: w.text,
      startFrame: w.startFrame,
      endFrame: w.endFrame,
    }));
  }

  const duration = caption.endFrame - caption.startFrame;
  const wordDuration = duration / textWords.length;
  return textWords.map((text, i) => ({
    text,
    startFrame: caption.startFrame + Math.round(i * wordDuration),
    endFrame: caption.startFrame + Math.round((i + 1) * wordDuration),
  }));
}

const CaptionWord: React.FC<{
  word: WordInfo;
  index: number;
  style: CaptionStylePack;
  frame: number;
  fps: number;
  captionStartFrame: number;
}> = ({ word, index, style, frame, fps, captionStartFrame }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const isFuture = frame < word.startFrame;

  const localWordFrame = Math.max(0, frame - word.startFrame);
  const wordDuration = word.endFrame - word.startFrame;
  const wordProgress = wordDuration > 0 ? Math.min(1, localWordFrame / wordDuration) : 0;

  let wordColor = style.inactiveColor;
  if (isPast) wordColor = style.textColor;
  if (isActive) wordColor = style.activeColor;

  const baseWordStyle: React.CSSProperties = {
    display: "inline-block",
    position: "relative",
    marginRight: style.wordSpacing,
    transition: "color 0.1s ease",
  };

  switch (style.highlightMode) {
    case "word-highlight": {
      return (
        <span style={{ ...baseWordStyle, color: wordColor }}>
          {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
        </span>
      );
    }

    case "word-pop": {
      const scaleVal = isActive
        ? spring({
            frame: localWordFrame,
            fps,
            config: { damping: 12, stiffness: 200, mass: 0.5 },
            durationInFrames: Math.min(wordDuration, 15),
          }) * 0.15 + 1
        : 1;

      return (
        <span
          style={{
            ...baseWordStyle,
            color: wordColor,
            transform: `scale(${scaleVal})`,
            transformOrigin: "center bottom",
          }}
        >
          {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
        </span>
      );
    }

    case "underline-sweep": {
      const underlineWidth = isActive ? wordProgress * 100 : isPast ? 100 : 0;
      return (
        <span style={{ ...baseWordStyle, color: wordColor }}>
          {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
          <span
            style={{
              position: "absolute",
              bottom: -2,
              left: 0,
              height: 3,
              width: `${underlineWidth}%`,
              backgroundColor: style.activeColor,
              borderRadius: 2,
              transition: isPast ? "none" : undefined,
            }}
          />
        </span>
      );
    }

    case "pill-glow": {
      return (
        <span
          style={{
            ...baseWordStyle,
            color: isActive ? "#FFFFFF" : wordColor,
            backgroundColor: isActive ? style.activeColor : "transparent",
            borderRadius: 6,
            padding: isActive ? "2px 6px" : "2px 0",
            transition: "background-color 0.15s ease, padding 0.15s ease",
          }}
        >
          {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
        </span>
      );
    }

    case "karaoke-fill": {
      const fillWidth = isActive ? wordProgress * 100 : isPast ? 100 : 0;
      return (
        <span
          style={{
            ...baseWordStyle,
            color: isFuture ? style.inactiveColor : style.textColor,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span style={{ visibility: "hidden" }}>
            {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              color: style.inactiveColor,
              whiteSpace: "nowrap",
            }}
          >
            {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              color: style.activeColor,
              overflow: "hidden",
              whiteSpace: "nowrap",
              width: `${fillWidth}%`,
            }}
          >
            {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
          </span>
        </span>
      );
    }

    default:
      return (
        <span style={{ ...baseWordStyle, color: style.textColor }}>
          {style.textTransform === "uppercase" ? word.text.toUpperCase() : word.text}
        </span>
      );
  }
};

export const CaptionTrack: React.FC<CaptionTrackProps> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {captions.map((caption) => {
        if (frame < caption.startFrame || frame >= caption.endFrame) return null;

        const stylePack = captionStylePacks[caption.stylePackId] || captionStylePacks["default"];
        const localFrame = frame - caption.startFrame;
        const duration = caption.endFrame - caption.startFrame;

        const fadeOut = interpolate(localFrame, [duration - 5, duration], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const positionStyle = getPositionStyle(caption.position, caption.safeMargin);
        const backgroundStyle = getBackgroundStyle(stylePack);

        const strokeShadow = buildStrokeShadow(stylePack.strokeColor, stylePack.strokeWidth);
        const combinedShadow = [
          strokeShadow,
          stylePack.shadow !== "none" ? stylePack.shadow : "",
        ]
          .filter(Boolean)
          .join(", ") || "none";

        const words = getWordTimings(caption);

        const isMiddle = caption.position === "middle";
        const baseTransform = isMiddle ? "translate(-50%, -50%)" : "translateX(-50%)";

        return (
          <div
            key={caption.id}
            style={{
              position: "absolute",
              left: "50%",
              ...positionStyle,
              transform: baseTransform,
              opacity: fadeOut,
              fontFamily: stylePack.fontFamily,
              fontSize: stylePack.fontSize,
              fontWeight: stylePack.fontWeight,
              color: stylePack.textColor,
              textShadow: combinedShadow,
              lineHeight: stylePack.lineHeight,
              letterSpacing: stylePack.letterSpacing,
              whiteSpace: "nowrap",
              zIndex: 100,
              ...backgroundStyle,
            }}
          >
            {words.map((word, i) => (
              <CaptionWord
                key={`${caption.id}-w${i}`}
                word={word}
                index={i}
                style={stylePack}
                frame={frame}
                fps={fps}
                captionStartFrame={caption.startFrame}
              />
            ))}
          </div>
        );
      })}
    </>
  );
};
