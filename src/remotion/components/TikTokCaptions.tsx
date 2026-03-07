import React, { useMemo } from "react";
import { useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import type { Word } from "../types/edl";
import type { CaptionStyleSpec } from "../../captions/styleSpec";
import { SpecCaptionRenderer } from "../../captions/SpecCaptionRenderer";

interface TikTokCaptionsProps {
  words: Word[];
  clipStartFrame?: number;
  maxWordsPerLine?: number;
  accentColor?: string;
  fontSize?: number;
  styleSpec?: CaptionStyleSpec;
}

const PRESHOW_MS = 80;
const MIN_PHRASE_WORDS = 3;
const MAX_PHRASE_WORDS = 7;

const BREAK_AFTER = new Set([
  ".", ",", "!", "?", ";", ":", "—", "–", "-",
  "and", "but", "or", "so", "because", "then",
  "when", "while", "if", "that", "which", "who",
]);

function segmentIntoPhrases(words: Word[]): Word[][] {
  if (words.length === 0) return [];

  const phrases: Word[][] = [];
  let current: Word[] = [];

  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);

    const text = words[i].text.trim().toLowerCase();
    const endsWithPunct = /[.,!?;:—–\-]$/.test(text);
    const nextIsBreak =
      i + 1 < words.length &&
      BREAK_AFTER.has(words[i + 1].text.trim().toLowerCase());
    const isNaturalBreak = endsWithPunct || BREAK_AFTER.has(text) || nextIsBreak;

    const hasGap =
      i + 1 < words.length &&
      words[i + 1].startMs - words[i].endMs > 300;

    if (current.length >= MAX_PHRASE_WORDS) {
      phrases.push(current);
      current = [];
    } else if (
      current.length >= MIN_PHRASE_WORDS &&
      (isNaturalBreak || hasGap)
    ) {
      phrases.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    if (phrases.length > 0 && current.length < MIN_PHRASE_WORDS) {
      const last = phrases[phrases.length - 1];
      if (last.length + current.length <= MAX_PHRASE_WORDS) {
        phrases[phrases.length - 1] = [...last, ...current];
      } else {
        phrases.push(current);
      }
    } else {
      phrases.push(current);
    }
  }

  return phrases;
}

function wordsToCaptionSegments(words: Word[]) {
  const phrases = segmentIntoPhrases(words);
  return phrases.map((phrase, i) => ({
    id: `phrase-${i}`,
    text: phrase.map((w) => w.text).join(" "),
    startFrame: phrase[0].startFrame,
    endFrame: phrase[phrase.length - 1].endFrame + 12,
    stylePackId: "default",
    animationType: "none" as const,
    words: phrase.map((w) => ({
      text: w.text,
      startFrame: w.startFrame,
      endFrame: w.endFrame,
    })),
  }));
}

export const TikTokCaptions: React.FC<TikTokCaptionsProps> = ({
  words: rawWords,
  clipStartFrame = 0,
  maxWordsPerLine: _unused,
  accentColor = "#FBBF24",
  fontSize = 72,
  styleSpec,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const words = useMemo(
    () => rawWords.filter((w) => w.startFrame >= 0 && w.endFrame > 0 && w.startFrame < durationInFrames),
    [rawWords, durationInFrames]
  );

  if (styleSpec && words.length > 0) {
    const segments = useMemo(() => wordsToCaptionSegments(words), [words]);
    return <SpecCaptionRenderer captions={segments} styleSpec={styleSpec} />;
  }

  const preshowFrames = Math.round((PRESHOW_MS / 1000) * fps);

  const phrases = useMemo(() => segmentIntoPhrases(words), [words]);

  const activePhrase = phrases.find((phrase) => {
    const phraseStart =
      phrase[0].startFrame - clipStartFrame - preshowFrames;
    const phraseEnd =
      phrase[phrase.length - 1].endFrame - clipStartFrame + Math.round(fps * 0.4);
    return frame >= phraseStart && frame <= phraseEnd;
  });

  if (!activePhrase) return null;

  const phraseStart =
    activePhrase[0].startFrame - clipStartFrame - preshowFrames;

  const entranceProgress = spring({
    fps,
    frame: frame - phraseStart,
    config: { damping: 18, stiffness: 160 },
  });

  const phraseScale = interpolate(entranceProgress, [0, 1], [0.92, 1]);
  const phraseOpacity = interpolate(entranceProgress, [0, 1], [0, 1]);

  const phraseEnd =
    activePhrase[activePhrase.length - 1].endFrame - clipStartFrame;
  const fadeOutStart = phraseEnd + Math.round(fps * 0.25);
  const fadeOutEnd = phraseEnd + Math.round(fps * 0.4);
  const exitOpacity =
    frame > fadeOutStart
      ? interpolate(frame, [fadeOutStart, fadeOutEnd], [1, 0], {
          extrapolateRight: "clamp",
        })
      : 1;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "25%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "0 60px",
        transform: `scale(${phraseScale})`,
        opacity: phraseOpacity * exitOpacity,
      }}
    >
      {activePhrase.map((word, i) => {
        const wordShowFrame =
          word.startFrame - clipStartFrame - preshowFrames;
        const wordLocalStart = word.startFrame - clipStartFrame;
        const wordLocalEnd = word.endFrame - clipStartFrame;
        const isActive = frame >= wordLocalStart && frame <= wordLocalEnd;
        const hasAppeared = frame >= wordShowFrame;

        if (!hasAppeared) {
          return (
            <span
              key={i}
              style={{
                fontFamily: "Inter, Montserrat, sans-serif",
                fontWeight: 900,
                fontSize: `${fontSize}px`,
                textTransform: "uppercase",
                color: "transparent",
                display: "inline-block",
              }}
            >
              {word.text}
            </span>
          );
        }

        const pop = spring({
          fps,
          frame: frame - wordShowFrame,
          config: { damping: 20, stiffness: 140 },
        });

        const wordScale = isActive
          ? interpolate(pop, [0, 1], [1.05, 1.0])
          : interpolate(pop, [0, 1], [1.05, 1.0]);

        const wordOpacity = interpolate(pop, [0, 1], [0, 1]);

        return (
          <span
            key={i}
            style={{
              fontFamily: "Inter, Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: `${fontSize}px`,
              textTransform: "uppercase",
              transform: `scale(${wordScale})`,
              opacity: wordOpacity,
              color: isActive ? accentColor : "#FFFFFF",
              textShadow: [
                "0 2px 4px rgba(0,0,0,0.6)",
                "0 4px 8px rgba(0,0,0,0.3)",
                isActive ? `0 0 20px ${accentColor}50` : "",
              ]
                .filter(Boolean)
                .join(", "),
              WebkitTextStroke: "2px rgba(0,0,0,0.7)",
              paintOrder: "stroke fill",
              display: "inline-block",
              lineHeight: 1.2,
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
