import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import type { EDL, Word, Popup, TransitionType, BrollOverlay } from "./types/edl";
import { CinematicVideo } from "./components/CinematicVideo";
import { TikTokCaptions } from "./components/TikTokCaptions";
import { EmojiPopups } from "./components/EmojiPopups";
import { WatermarkOverlay } from "./components/WatermarkOverlay";
import { ColorGrading } from "./components/ColorGrading";
import { LumaBrollLayer } from "./components/LumaBrollLayer";

const DEFAULT_TRANSITION_FRAMES = 4;
const DEFAULT_AUDIO_FADE_MS = 120;
const DUCK_VOLUME_RATIO = 0.4;
const DUCK_RAMP_FRAMES = 10;

function localizePopups(popups: Popup[], trimStartFrame: number, fps: number): Popup[] {
  const trimStartSec = trimStartFrame / fps;
  return popups.map((p) => ({
    ...p,
    timeSec: p.timeSec - trimStartSec,
  })).filter((p) => p.timeSec >= 0);
}

function getTransitionPresentation(type: TransitionType | undefined, width: number, height: number) {
  switch (type) {
    case "slide":
      return slide();
    case "wipe":
      return wipe();
    case "clockWipe":
      return clockWipe({ width, height });
    case "flip":
      return flip();
    case "none":
      return undefined;
    case "fade":
    default:
      return fade();
  }
}

interface TikTokCompositionProps {
  edl: EDL;
  watermark?: boolean;
  accentColor?: string;
  captionFontSize?: number;
  captionStyleSpec?: any;
}

const MusicWithDucking: React.FC<{
  src: string;
  baseVolume: number;
  allWords: Word[];
  fps: number;
}> = ({ src, baseVolume, allWords, fps }) => {
  const frame = useCurrentFrame();

  const isSpeaking = allWords.some((w) => {
    const wStart = w.startFrame;
    const wEnd = w.endFrame;
    return frame >= wStart - DUCK_RAMP_FRAMES && frame <= wEnd + DUCK_RAMP_FRAMES;
  });

  let targetVolume = baseVolume;
  if (isSpeaking) {
    const nearestWord = allWords.reduce((closest, w) => {
      const dist = Math.min(Math.abs(frame - w.startFrame), Math.abs(frame - w.endFrame));
      const closestDist = Math.min(Math.abs(frame - closest.startFrame), Math.abs(frame - closest.endFrame));
      return dist < closestDist ? w : closest;
    }, allWords[0]);

    if (nearestWord) {
      const fadeInStart = nearestWord.startFrame - DUCK_RAMP_FRAMES;
      const fadeInEnd = nearestWord.startFrame;
      const fadeOutStart = nearestWord.endFrame;
      const fadeOutEnd = nearestWord.endFrame + DUCK_RAMP_FRAMES;

      if (frame >= fadeInStart && frame < fadeInEnd) {
        const t = interpolate(frame, [fadeInStart, fadeInEnd], [1, DUCK_VOLUME_RATIO], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        targetVolume = baseVolume * t;
      } else if (frame >= fadeInEnd && frame <= fadeOutStart) {
        targetVolume = baseVolume * DUCK_VOLUME_RATIO;
      } else if (frame > fadeOutStart && frame <= fadeOutEnd) {
        const t = interpolate(frame, [fadeOutStart, fadeOutEnd], [DUCK_VOLUME_RATIO, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        targetVolume = baseVolume * t;
      }
    }
  }

  return <Audio src={src} volume={targetVolume} />;
};

const BrollOverlayLayer: React.FC<{
  overlay: BrollOverlay;
}> = ({ overlay }) => {
  const frame = useCurrentFrame();
  const BROLL_FADE_FRAMES = 10;

  const fadeIn = interpolate(
    frame,
    [overlay.startFrame, overlay.startFrame + BROLL_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fadeOut = interpolate(
    frame,
    [overlay.startFrame + overlay.durationInFrames - BROLL_FADE_FRAMES, overlay.startFrame + overlay.durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = (overlay.opacity ?? 1) * fadeIn * fadeOut;

  if (frame < overlay.startFrame || frame > overlay.startFrame + overlay.durationInFrames) {
    return null;
  }

  return (
    <AbsoluteFill style={{ opacity, zIndex: 20 }}>
      <OffthreadVideo
        src={overlay.src}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

export const TikTokComposition: React.FC<TikTokCompositionProps> = ({
  edl,
  watermark = false,
  accentColor = "#FBBF24",
  captionFontSize = 72,
  captionStyleSpec,
}) => {
  const { width, height } = useVideoConfig();
  const musicVolume = edl.musicVolume ?? 0.3;
  const colorGrade = edl.colorGrade ?? "none";

  const allGlobalWords = useMemo(() => {
    const words: Word[] = [];
    let frameOffset = 0;
    for (const clip of edl.clips) {
      for (const w of clip.words) {
        words.push({
          ...w,
          startFrame: w.startFrame + frameOffset,
          endFrame: w.endFrame + frameOffset,
        });
      }
      frameOffset += clip.durationInFrames - (clip.crossfadeFrames ?? DEFAULT_TRANSITION_FRAMES);
    }
    return words;
  }, [edl.clips]);

  const localizedClips = useMemo(
    () =>
      edl.clips.map((clip, index) => {
        const crossfadeFrames = clip.crossfadeFrames ?? DEFAULT_TRANSITION_FRAMES;
        const audioFadeMs = clip.audioFadeMs ?? DEFAULT_AUDIO_FADE_MS;
        const isFirst = index === 0;
        const isLast = index === edl.clips.length - 1;

        return {
          ...clip,
          localWords: clip.words.filter((w: Word) => w.startFrame >= 0 && w.endFrame > 0),
          localPopups: localizePopups(clip.popups || [], clip.trimStartFrame, edl.fps),
          crossfadeFrames: isFirst || isLast ? Math.max(2, crossfadeFrames - 1) : crossfadeFrames,
          audioFadeMs: isFirst ? 0 : audioFadeMs,
        };
      }),
    [edl.clips, edl.fps]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {localizedClips.map((clip, index) => {
          const transitionFrames = clip.transitionDurationFrames ?? (clip.crossfadeFrames || DEFAULT_TRANSITION_FRAMES);
          const transitionType = clip.transitionType ?? "fade";

          return (
            <React.Fragment key={clip.id}>
              <TransitionSeries.Sequence durationInFrames={clip.durationInFrames}>
                <CinematicVideo
                  src={clip.src}
                  trimStartFrame={clip.trimStartFrame}
                  endFrame={clip.trimStartFrame + clip.durationInFrames}
                  cameraMoves={clip.cameraMoves}
                  audioFadeMs={clip.audioFadeMs}
                />

                {clip.localWords.length > 0 && (
                  <TikTokCaptions
                    words={clip.localWords}
                    clipStartFrame={0}
                    accentColor={accentColor}
                    fontSize={captionFontSize}
                    styleSpec={captionStyleSpec}
                  />
                )}

                {clip.localPopups.length > 0 && (
                  <EmojiPopups popups={clip.localPopups} clipStartFrame={0} />
                )}
              </TransitionSeries.Sequence>

              {index < localizedClips.length - 1 && transitionType !== "none" && (
                <TransitionSeries.Transition
                  presentation={getTransitionPresentation(transitionType, width, height)!}
                  timing={linearTiming({ durationInFrames: transitionFrames })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {edl.brollOverlays && edl.brollOverlays.length > 0 && (
        <>
          {edl.brollOverlays.map((overlay, i) => (
            <BrollOverlayLayer key={`broll-${i}`} overlay={overlay} />
          ))}
        </>
      )}

      {edl.lumaBroll && edl.lumaBroll.length > 0 && (
        <LumaBrollLayer inserts={edl.lumaBroll} />
      )}

      {edl.popups && edl.popups.length > 0 && (
        <EmojiPopups popups={edl.popups} />
      )}

      {colorGrade !== "none" && (
        <ColorGrading
          preset={colorGrade}
          filmGrain={colorGrade === "cinematic" || colorGrade === "vintage"}
          vignette={colorGrade === "cinematic" || colorGrade === "moody"}
        />
      )}

      {edl.musicSrc && (
        <MusicWithDucking
          src={edl.musicSrc}
          baseVolume={musicVolume}
          allWords={allGlobalWords}
          fps={edl.fps}
        />
      )}

      <WatermarkOverlay enabled={watermark} />
    </AbsoluteFill>
  );
};
