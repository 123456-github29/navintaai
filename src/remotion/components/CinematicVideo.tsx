import React, { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { CameraMove } from "../types/edl";

const easeInOutCubic = Easing.bezier(0.65, 0, 0.35, 1);

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface CinematicVideoProps {
  src: string;
  trimStartFrame?: number;
  endFrame?: number;
  cameraMoves?: CameraMove[];
  volume?: number;
  audioFadeMs?: number;
}

export const CinematicVideo: React.FC<CinematicVideoProps> = ({
  src,
  trimStartFrame = 0,
  endFrame,
  cameraMoves = [],
  volume = 1,
  audioFadeMs = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const microDriftSeed = useMemo(() => Math.floor(Math.random() * 10000), []);

  let scaleValue = 1;
  let xValue = 0;
  let yValue = 0;
  let rotationValue = 0;
  const clipFrames = Math.max(1, (endFrame ?? (trimStartFrame + durationInFrames)) - trimStartFrame);

  const toLocalFrame = (timeSec: number): number => {
    const frameFromSec = Math.round(timeSec * fps);
    const looksLocal = frameFromSec <= clipFrames + fps;
    return looksLocal
      ? frameFromSec
      : frameFromSec - trimStartFrame;
  };

  for (const move of cameraMoves) {
    const localStart = Math.max(0, toLocalFrame(move.startSec));
    const localEnd = Math.max(0, toLocalFrame(move.endSec));

    if (localStart === localEnd) continue;

    const progress = (frame >= localStart && frame <= localEnd)
      ? interpolate(frame, [localStart, localEnd], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easeInOutCubic,
        })
      : frame > localEnd ? 1 : 0;

    if (move.type === "zoom_in" || move.type === "zoom_out") {
      const fromScale = move.fromScale ?? 1;
      const toScale = move.toScale ?? (move.type === "zoom_in" ? 1.3 : 1);

      if (progress > 0) {
        scaleValue = interpolate(progress, [0, 1], [fromScale, toScale]);
      }

      if (move.xOffset && progress > 0) {
        xValue += move.xOffset * progress;
      }
      if (move.yOffset && progress > 0) {
        yValue += move.yOffset * progress;
      }
    }

    if (move.type === "pan_left" || move.type === "pan_right") {
      const offset = move.xOffset ?? (move.type === "pan_right" ? 200 : -200);
      if (progress > 0) {
        xValue += offset * progress;
      }
    }

    if (move.type === "pan_up" || move.type === "pan_down") {
      const offset = move.yOffset ?? (move.type === "pan_down" ? 150 : -150);
      if (progress > 0) {
        yValue += offset * progress;
      }
    }

    if (move.type === "tilt_up" || move.type === "tilt_down") {
      const offset = move.yOffset ?? (move.type === "tilt_down" ? 120 : -120);
      if (progress > 0) {
        yValue += offset * progress;
      }
    }

    if (move.type === "rotate_cw" || move.type === "rotate_ccw") {
      const targetRotation = move.rotation ?? (move.type === "rotate_cw" ? 5 : -5);
      if (progress > 0) {
        rotationValue += targetRotation * progress;
      }
    }

    if (move.type === "dolly_in" || move.type === "dolly_out") {
      const fromScale = move.fromScale ?? 1;
      const toScale = move.toScale ?? (move.type === "dolly_in" ? 1.25 : 1);
      const yDrift = move.yOffset ?? (move.type === "dolly_in" ? -30 : 30);

      if (progress > 0) {
        scaleValue = interpolate(progress, [0, 1], [fromScale, toScale]);
        yValue += yDrift * progress;
      }
    }

    if (move.type === "tracking") {
      const amplitude = move.xOffset ?? 150;
      if (frame >= localStart && frame <= localEnd) {
        const t = (frame - localStart) / Math.max(1, localEnd - localStart);
        xValue += Math.sin(t * Math.PI * 2) * amplitude * 0.5;
      }
    }
  }

  if (scaleValue > 1.02) {
    const driftX = Math.sin(frame * 0.03 + seededRandom(microDriftSeed) * 100) * 3;
    const driftY = Math.cos(frame * 0.025 + seededRandom(microDriftSeed + 1) * 100) * 2.5;
    xValue += driftX;
    yValue += driftY;
  }

  let effectiveVolume = volume;
  if (audioFadeMs > 0) {
    const effectiveFadeMs = Math.max(audioFadeMs, 80);
    const fadeFrames = Math.max(2, Math.ceil((effectiveFadeMs / 1000) * fps));
    const clipFrames = endFrame ? endFrame - trimStartFrame : durationInFrames;

    const fadeIn = interpolate(frame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const fadeOut = interpolate(
      frame,
      [Math.max(0, clipFrames - fadeFrames), clipFrames],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }
    );

    effectiveVolume = volume * fadeIn * fadeOut;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${scaleValue}) translateX(${xValue}px) translateY(${yValue}px) rotate(${rotationValue}deg)`,
          transformOrigin: "center center",
          overflow: "hidden",
        }}
      >
        <OffthreadVideo
          src={src}
          startFrom={trimStartFrame}
          endAt={endFrame}
          volume={effectiveVolume}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </AbsoluteFill>
  );
};
