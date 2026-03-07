import React from "react";
import { Video, useCurrentFrame, spring, interpolate } from "remotion";
import type { Clip } from "../types/edl";

export const SmartVideoClip: React.FC<{ clip: Clip; fps: number }> = ({ clip, fps }) => {
  const frame = useCurrentFrame();

  const motion = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80, mass: 0.8 },
  });

  const scale = interpolate(motion, [0, 1], [1, clip.zoomTarget]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        filter: "contrast(1.06) saturate(1.12) brightness(1.02) sepia(0.04)",
      }}
    >
      <Video
        src={clip.src}
        startFrom={clip.trimStartFrame}
        endAt={clip.trimStartFrame + clip.durationInFrames}
      />
    </div>
  );
};
