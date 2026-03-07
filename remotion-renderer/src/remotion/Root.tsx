import React from "react";
import { registerRoot, Composition } from "remotion";
import { SmartComposition } from "./SmartComposition";
import { TikTokComposition } from "./TikTokComposition";
import type { EDL } from "./types/edl";

const demoEdl: EDL = {
  fps: 30,
  musicSrc: null,
  clips: [
    {
      id: "demo",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      trimStartFrame: 0,
      durationInFrames: 300,
      zoomTarget: 1.1,
      words: [],
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="NavintaPremium"
        component={SmartComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ edl: demoEdl }}
      />
      <Composition
        id="TikTokStyle"
        component={TikTokComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          edl: demoEdl,
          watermark: true,
          accentColor: "#FBBF24",
          captionFontSize: 72,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
