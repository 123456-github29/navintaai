import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { Transition } from "../../schemas/editDecision.schema";

interface TransitionLayerProps {
  transitions: Transition[];
}

export const TransitionLayer: React.FC<TransitionLayerProps> = ({ transitions }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {transitions.map((transition) => {
        const start = transition.atFrame;
        const end = start + transition.durationFrames;

        if (frame < start || frame >= end) return null;

        const progress = interpolate(frame, [start, end], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        if (transition.type === "crossfade") {
          const opacity = interpolate(progress, [0, 0.5, 1], [0, 0.8, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={transition.id}
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "black",
                opacity,
                zIndex: 50,
                pointerEvents: "none",
              }}
            />
          );
        }

        if (transition.type === "blur-dissolve") {
          const blur = interpolate(progress, [0, 0.5, 1], [0, 12, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={transition.id}
              style={{
                position: "absolute",
                inset: 0,
                backdropFilter: `blur(${blur}px)`,
                zIndex: 50,
                pointerEvents: "none",
              }}
            />
          );
        }

        return null;
      })}
    </>
  );
};
