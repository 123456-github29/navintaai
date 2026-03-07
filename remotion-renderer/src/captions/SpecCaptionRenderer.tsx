import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { CaptionStyleSpec } from "./styleSpec";
import type { CaptionSegment, WordTiming } from "../schemas/editDecision.schema";

interface WordInfo {
  text: string;
  startFrame: number;
  endFrame: number;
  index: number;
}

interface SpecCaptionRendererProps {
  captions: CaptionSegment[];
  styleSpec: CaptionStyleSpec;
}

function getWordTimings(caption: CaptionSegment): WordInfo[] {
  const textWords = caption.text.split(/\s+/).filter(Boolean);
  if (!textWords.length) return [];

  if (caption.words && caption.words.length > 0) {
    return caption.words.map((w: WordTiming, i: number) => ({
      text: w.text,
      startFrame: w.startFrame,
      endFrame: w.endFrame,
      index: i,
    }));
  }

  const duration = caption.endFrame - caption.startFrame;
  const wordDuration = duration / textWords.length;
  return textWords.map((text, i) => ({
    text,
    startFrame: caption.startFrame + Math.round(i * wordDuration),
    endFrame: caption.startFrame + Math.round((i + 1) * wordDuration),
    index: i,
  }));
}

function buildStrokeShadow(color: string, width: number): string {
  if (width <= 0) return "";
  const w = width;
  return [
    `${w}px 0 0 ${color}`, `${-w}px 0 0 ${color}`,
    `0 ${w}px 0 ${color}`, `0 ${-w}px 0 ${color}`,
    `${w}px ${w}px 0 ${color}`, `${-w}px ${w}px 0 ${color}`,
    `${w}px ${-w}px 0 ${color}`, `${-w}px ${-w}px 0 ${color}`,
  ].join(", ");
}

function buildTextShadow(spec: CaptionStyleSpec): string {
  const parts: string[] = [];
  if (spec.stroke.enabled && spec.stroke.widthPx > 0) {
    parts.push(buildStrokeShadow(spec.stroke.color, spec.stroke.widthPx));
  }
  if (spec.shadow.enabled && spec.shadow.blurPx > 0) {
    parts.push(
      `${spec.shadow.offsetXPx}px ${spec.shadow.offsetYPx}px ${spec.shadow.blurPx}px ${spec.shadow.color}`
    );
  }
  return parts.filter(Boolean).join(", ") || "none";
}

function getPositionStyle(spec: CaptionStyleSpec): React.CSSProperties {
  const margin = spec.layout.safeMarginPx;
  switch (spec.layout.position) {
    case "top":
      return { top: margin, bottom: "auto" };
    case "middle":
      return { top: "50%", bottom: "auto", transform: "translate(-50%, -50%)" };
    case "bottom":
    default:
      return { bottom: margin, top: "auto" };
  }
}

function hexToRgb(hex: string): string {
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) {
    const m = hex.match(/[\d.]+/g);
    if (m && m.length >= 3) return `${m[0]}, ${m[1]}, ${m[2]}`;
  }
  const cleaned = hex.replace("#", "");
  if (cleaned.length < 6) return "255, 255, 255";
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyTextTransform(text: string, transform: string): string {
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  return text;
}

const TiktokClassicPopWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame, fps }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const localFrame = Math.max(0, frame - word.startFrame);
  const wordDuration = word.endFrame - word.startFrame;

  const fillColor = spec.fill.color;
  const activeColor = spec.highlight.activeColor;
  const inactiveColor = `rgba(${hexToRgb(fillColor)}, ${spec.highlight.inactiveOpacity})`;

  let color = inactiveColor;
  if (isPast) color = fillColor;
  if (isActive) color = activeColor;

  const scaleVal = isActive
    ? spring({ frame: localFrame, fps, config: { damping: 12, stiffness: 200, mass: 0.5 }, durationInFrames: Math.min(wordDuration, 15) }) * (spec.highlight.scale - 1) + 1
    : 1;

  return (
    <span style={{
      display: "inline-block",
      marginRight: spec.layout.wordSpacingPx,
      color,
      transform: `scale(${scaleVal})`,
      transformOrigin: "center bottom",
    }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

const SubtitleBarWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const fillColor = spec.fill.color;
  const activeColor = spec.highlight.activeColor;

  let color = `rgba(${hexToRgb(fillColor)}, ${spec.highlight.inactiveOpacity})`;
  if (isPast) color = fillColor;
  if (isActive) color = activeColor;

  return (
    <span style={{
      display: "inline-block",
      marginRight: spec.layout.wordSpacingPx,
      color,
    }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

const TypewriterWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number; isLast: boolean;
}> = ({ word, spec, frame, fps, isLast }) => {
  const isRevealed = frame >= word.startFrame;

  if (!isRevealed) return null;

  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const fillColor = spec.fill.color;

  const showCursor = spec.motion.typewriterCursor && isActive && isLast;
  const blinkPeriodFrames = Math.round((spec.motion.cursorBlinkMs / 1000) * fps);
  const cursorVisible = showCursor ? Math.floor((frame - word.startFrame) / Math.max(1, Math.round(blinkPeriodFrames / 2))) % 2 === 0 : false;

  return (
    <span style={{ display: "inline-block", marginRight: spec.layout.wordSpacingPx, color: fillColor }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
      {cursorVisible && (
        <span style={{
          display: "inline-block",
          width: 3,
          height: "1em",
          backgroundColor: spec.highlight.activeColor,
          marginLeft: 2,
          verticalAlign: "text-bottom",
        }} />
      )}
    </span>
  );
};

const PerWordPillWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame, fps }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const localFrame = Math.max(0, frame - word.startFrame);
  const wordDuration = word.endFrame - word.startFrame;

  const fillColor = spec.fill.color;
  const inactiveColor = `rgba(${hexToRgb(fillColor)}, ${spec.highlight.inactiveOpacity})`;
  let color = inactiveColor;
  if (isPast) color = fillColor;
  if (isActive) color = "#FFFFFF";

  const scaleVal = isActive && spec.highlight.scale > 1
    ? spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 180, mass: 0.4 }, durationInFrames: Math.min(wordDuration, 12) }) * (spec.highlight.scale - 1) + 1
    : 1;

  return (
    <span style={{
      display: "inline-block",
      marginRight: spec.layout.wordSpacingPx,
      color,
      backgroundColor: isActive ? spec.highlight.pillColor : "transparent",
      borderRadius: spec.highlight.pillRadiusPx,
      padding: isActive ? `${spec.highlight.pillPaddingPx * 0.5}px ${spec.highlight.pillPaddingPx}px` : `${spec.highlight.pillPaddingPx * 0.5}px 0`,
      transform: `scale(${scaleVal})`,
      transformOrigin: "center bottom",
    }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

const GlassPillWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const fillColor = spec.fill.color;
  const inactiveColor = `rgba(${hexToRgb(fillColor)}, ${spec.highlight.inactiveOpacity})`;

  let color = inactiveColor;
  if (isPast) color = fillColor;
  if (isActive) color = "#FFFFFF";

  return (
    <span style={{
      display: "inline-block",
      marginRight: spec.layout.wordSpacingPx,
      color,
      backgroundColor: isActive ? `rgba(${hexToRgb(spec.highlight.pillColor)}, ${spec.highlight.pillOpacity})` : "transparent",
      borderRadius: spec.highlight.pillRadiusPx,
      padding: isActive ? `${spec.highlight.pillPaddingPx * 0.5}px ${spec.highlight.pillPaddingPx}px` : `${spec.highlight.pillPaddingPx * 0.5}px 0`,
    }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

const MarkerHighlightWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame, fps }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const localFrame = Math.max(0, frame - word.startFrame);
  const wordDuration = word.endFrame - word.startFrame;

  const fillColor = spec.fill.color;
  const inactiveColor = `rgba(${hexToRgb(fillColor)}, ${spec.highlight.inactiveOpacity})`;
  let color = inactiveColor;
  if (isPast) color = fillColor;
  if (isActive) color = fillColor;

  const markerWidth = isActive
    ? spring({ frame: localFrame, fps, config: { damping: 15, stiffness: 160, mass: 0.6 }, durationInFrames: Math.min(wordDuration, 10) }) * 100
    : 0;

  return (
    <span style={{
      display: "inline-block",
      position: "relative",
      marginRight: spec.layout.wordSpacingPx,
      color,
    }}>
      {isActive && (
        <span style={{
          position: "absolute",
          left: -4,
          right: -4,
          bottom: "0%",
          height: "40%",
          backgroundColor: spec.highlight.activeColor,
          borderRadius: 4,
          opacity: 0.6,
          width: `${markerWidth}%`,
          transform: "rotate(-1deg)",
          zIndex: -1,
        }} />
      )}
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

const NeonGlowWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame, fps }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const localFrame = Math.max(0, frame - word.startFrame);

  const fillColor = spec.fill.color;
  const activeColor = spec.highlight.activeColor;
  const inactiveColor = `rgba(${hexToRgb(fillColor)}, ${spec.highlight.inactiveOpacity})`;

  let color = inactiveColor;
  if (isPast) color = fillColor;
  if (isActive) color = activeColor;

  let glowIntensity = 1;
  if (isActive && spec.motion.glowPulse) {
    const pulseSpeed = 0.15;
    glowIntensity = 0.7 + 0.3 * Math.sin(localFrame * pulseSpeed);
  }

  const glowBlur = isActive ? spec.shadow.blurPx * glowIntensity * 1.5 : spec.shadow.blurPx * 0.3;
  const glowColor = isActive ? activeColor : spec.shadow.color;

  return (
    <span style={{
      display: "inline-block",
      marginRight: spec.layout.wordSpacingPx,
      color,
      textShadow: `0 0 ${glowBlur}px ${glowColor}, 0 0 ${glowBlur * 2}px ${glowColor}`,
    }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

const CinematicPlateWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const fillColor = spec.fill.color;
  const activeColor = spec.highlight.activeColor;
  const inactiveColor = `rgba(${hexToRgb(fillColor)}, ${Math.max(spec.highlight.inactiveOpacity, 0.7)})`;

  let color = inactiveColor;
  if (isPast) color = fillColor;
  if (isActive) color = activeColor;

  return (
    <span style={{
      display: "inline-block",
      marginRight: spec.layout.wordSpacingPx,
      color,
    }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

const KineticBounceWord: React.FC<{
  word: WordInfo; spec: CaptionStyleSpec; frame: number; fps: number;
}> = ({ word, spec, frame, fps }) => {
  const isActive = frame >= word.startFrame && frame < word.endFrame;
  const isPast = frame >= word.endFrame;
  const localFrame = Math.max(0, frame - word.startFrame);
  const wordDuration = word.endFrame - word.startFrame;

  const fillColor = spec.fill.color;
  const activeColor = spec.highlight.activeColor;
  const inactiveColor = `rgba(${hexToRgb(fillColor)}, ${spec.highlight.inactiveOpacity})`;

  let color = inactiveColor;
  if (isPast) color = fillColor;
  if (isActive) color = activeColor;

  const staggerDelay = word.index * Math.round((spec.motion.staggerMs / 1000) * fps);
  const bounceFrame = Math.max(0, frame - word.startFrame - staggerDelay);
  const isVisible = frame >= word.startFrame;

  const bounceAmount = spec.motion.bounceScale || 0.3;
  const bounceY = isVisible
    ? spring({ frame: bounceFrame, fps, config: { damping: 8, stiffness: 300, mass: 0.4 }, durationInFrames: Math.min(wordDuration, 20) })
    : 0;

  const translateY = (1 - bounceY) * 30 * bounceAmount;
  const opacity = bounceY;

  return (
    <span style={{
      display: "inline-block",
      marginRight: spec.layout.wordSpacingPx,
      color,
      transform: `translateY(${translateY}px)`,
      opacity: Math.max(0.1, opacity),
    }}>
      {applyTextTransform(word.text, spec.typography.textTransform)}
    </span>
  );
};

function renderFamilyWords(
  words: WordInfo[],
  spec: CaptionStyleSpec,
  frame: number,
  fps: number,
  captionId: string,
): React.ReactNode {
  const family = spec.styleFamily || "tiktok_classic_pop";

  switch (family) {
    case "tiktok_classic_pop":
      return words.map((w, i) => (
        <TiktokClassicPopWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    case "subtitle_bar":
      return words.map((w, i) => (
        <SubtitleBarWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    case "typewriter_cursor":
      return words.map((w, i) => (
        <TypewriterWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} isLast={i === words.length - 1} />
      ));

    case "per_word_pill":
      return words.map((w, i) => (
        <PerWordPillWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    case "glass_pill":
      return words.map((w, i) => (
        <GlassPillWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    case "marker_highlight":
      return words.map((w, i) => (
        <MarkerHighlightWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    case "neon_glow":
      return words.map((w, i) => (
        <NeonGlowWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    case "cinematic_plate":
      return words.map((w, i) => (
        <CinematicPlateWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    case "kinetic_bounce":
      return words.map((w, i) => (
        <KineticBounceWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));

    default:
      return words.map((w, i) => (
        <TiktokClassicPopWord key={`${captionId}-w${i}`} word={w} spec={spec} frame={frame} fps={fps} />
      ));
  }
}

export const SpecCaptionRenderer: React.FC<SpecCaptionRendererProps> = ({
  captions,
  styleSpec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {captions.map((caption) => {
        if (frame < caption.startFrame || frame >= caption.endFrame) return null;

        const localFrame = frame - caption.startFrame;
        const duration = caption.endFrame - caption.startFrame;

        const fadeOut = interpolate(localFrame, [duration - 5, duration], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        let lineInOpacity = 1;
        let lineInTranslateY = 0;
        let lineInScale = 1;
        if (styleSpec.motion.lineIn !== "none" && styleSpec.motion.lineInMs > 0) {
          const lineInFrames = Math.round((styleSpec.motion.lineInMs / 1000) * fps);
          const lineInProgress = interpolate(localFrame, [0, lineInFrames], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          if (styleSpec.motion.lineIn === "fade-up") {
            lineInOpacity = lineInProgress;
            lineInTranslateY = interpolate(lineInProgress, [0, 1], [15, 0]);
          } else if (styleSpec.motion.lineIn === "fade-in") {
            lineInOpacity = lineInProgress;
          } else if (styleSpec.motion.lineIn === "pop") {
            lineInOpacity = lineInProgress;
            lineInScale = interpolate(lineInProgress, [0, 0.6, 1], [0.8, 1.05, 1]);
          }
        }

        const positionStyle = getPositionStyle(styleSpec);
        const textShadow = buildTextShadow(styleSpec);
        const words = getWordTimings(caption);

        const family = styleSpec.styleFamily || "tiktok_classic_pop";
        const isNeonFamily = family === "neon_glow";

        const isMiddle = styleSpec.layout.position === "middle";
        let transformStr = isMiddle ? "translate(-50%, -50%)" : "translateX(-50%)";
        if (lineInTranslateY !== 0) transformStr += ` translateY(${lineInTranslateY}px)`;
        if (lineInScale !== 1) transformStr += ` scale(${lineInScale})`;

        const showPlate = styleSpec.plate.enabled || family === "subtitle_bar" || family === "cinematic_plate" || family === "glass_pill";
        const plateStyle: React.CSSProperties = showPlate
          ? {
              backgroundColor: styleSpec.plate.color,
              opacity: styleSpec.plate.opacity,
              borderRadius: styleSpec.plate.radiusPx,
              padding: `${styleSpec.plate.paddingPx * 0.6}px ${styleSpec.plate.paddingPx}px`,
              backdropFilter: (family === "glass_pill" || styleSpec.plate.blurPx > 0)
                ? `blur(${Math.max(styleSpec.plate.blurPx, family === "glass_pill" ? 10 : 0)}px)`
                : undefined,
            }
          : { padding: `${styleSpec.plate.paddingPx * 0.6}px ${styleSpec.plate.paddingPx}px` };

        return (
          <div
            key={caption.id}
            style={{
              position: "absolute",
              left: "50%",
              ...positionStyle,
              transform: transformStr,
              opacity: fadeOut * lineInOpacity,
              fontFamily: `'${styleSpec.typography.fontFamily}', 'Inter', sans-serif`,
              fontSize: styleSpec.typography.fontSizePx,
              fontWeight: styleSpec.typography.fontWeight,
              color: styleSpec.fill.color,
              textShadow: isNeonFamily ? "none" : textShadow,
              lineHeight: styleSpec.typography.lineHeight,
              letterSpacing: styleSpec.typography.letterSpacingPx,
              textAlign: styleSpec.layout.align,
              maxWidth: `${styleSpec.layout.maxWidthPct}%`,
              whiteSpace: "nowrap",
              zIndex: 100,
              ...plateStyle,
            }}
          >
            {renderFamilyWords(words, styleSpec, frame, fps, caption.id)}
          </div>
        );
      })}
    </>
  );
};
