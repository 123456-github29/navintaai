import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  OffthreadVideo,
  Sequence,
} from "remotion";

export interface BRollSegment {
  timestamp: number; // seconds into the main video timeline
  duration: number;  // seconds
  url?: string;
}

// Inside a <Sequence>, useCurrentFrame() starts at 0 for the segment's duration.
function SingleBRoll({ segment }: { segment: BRollSegment }) {
  const frame = useCurrentFrame(); // local frame within this Sequence
  const { fps } = useVideoConfig();

  const totalFrames = Math.round(segment.duration * fps);

  // Fade in/out
  const fadeDuration = Math.min(10, totalFrames * 0.2);
  const opacity = interpolate(
    frame,
    [0, fadeDuration, totalFrames - fadeDuration, totalFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Ken Burns: slow zoom in over the clip
  const scale = interpolate(frame, [0, totalFrames], [1.0, 1.06], {
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
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </div>
    </div>
  );
}

export const BRollLayer: React.FC<{ segments: BRollSegment[]; timelineOffset: number }> = ({
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
            <Sequence key={i} from={startFrame} durationInFrames={durationFrames}>
              <SingleBRoll segment={seg} />
            </Sequence>
          );
        })}
    </>
  );
};
