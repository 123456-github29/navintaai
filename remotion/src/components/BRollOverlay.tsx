import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  OffthreadVideo,
  Sequence,
} from "remotion";

export interface BRollSegment {
  timestamp: number; // seconds into main video when to show broll
  duration: number;  // seconds
  url?: string;
}

interface BRollProps {
  segments: BRollSegment[];
}

function SingleBRoll({
  segment,
  offsetFrames,
}: {
  segment: BRollSegment;
  offsetFrames: number; // frame offset within the sequence
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const totalFrames = Math.round(segment.duration * fps);
  const localFrame = frame;

  // Fade in/out
  const fadeDuration = Math.min(10, totalFrames * 0.2);
  const opacity = interpolate(
    localFrame,
    [0, fadeDuration, totalFrames - fadeDuration, totalFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Ken Burns effect: slow zoom in
  const scale = interpolate(localFrame, [0, totalFrames], [1.0, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (!segment.url) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={segment.url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          muted
        />
      </div>
    </div>
  );
}

export const BRollLayer: React.FC<BRollProps & { timelineOffset: number }> = ({
  segments,
  timelineOffset,
}) => {
  const { fps } = useVideoConfig();

  if (!segments || segments.length === 0) return null;

  return (
    <>
      {segments
        .filter((s) => s.url)
        .map((seg, i) => {
          const startFrame = Math.round(seg.timestamp * fps) + timelineOffset;
          const durationFrames = Math.round(seg.duration * fps);

          return (
            <Sequence
              key={i}
              from={startFrame}
              durationInFrames={durationFrames}
            >
              <SingleBRoll segment={seg} offsetFrames={startFrame} />
            </Sequence>
          );
        })}
    </>
  );
};
