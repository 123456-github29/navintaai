import React from "react";
import { registerRoot, Composition } from "remotion";
import { MainComposition } from "./Composition";
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

const tiktokDemoEdl: EDL = {
  fps: 30,
  musicSrc: null,
  clips: [
    {
      id: "tiktok-demo",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      trimStartFrame: 0,
      durationInFrames: 300,
      zoomTarget: 1.15,
      words: [
        { text: "Building", startMs: 0, endMs: 500, startFrame: 0, endFrame: 15 },
        { text: "apps", startMs: 500, endMs: 1000, startFrame: 15, endFrame: 30 },
        { text: "is", startMs: 1000, endMs: 1200, startFrame: 30, endFrame: 36 },
        { text: "awesome", startMs: 1200, endMs: 2000, startFrame: 36, endFrame: 60 },
      ],
      cameraMoves: [
        { type: "zoom_in", startSec: 0, endSec: 3, fromScale: 1, toScale: 1.3 },
        { type: "zoom_out", startSec: 5, endSec: 7, fromScale: 1.3, toScale: 1 },
      ],
      popups: [
        { emoji: "\u{1F680}", timeSec: 0.5, durationSec: 2, positionX: 70, positionY: 25 },
        { emoji: "\u{1F525}", timeSec: 1.2, durationSec: 2, positionX: 30, positionY: 20 },
      ],
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PremiumVideo"
        component={MainComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          version: 1 as const,
          fps: 30,
          width: 1080,
          height: 1920,
          durationInFrames: 300,
          tracks: {
            video: [],
            captions: [],
            transitions: [],
            audio: [],
          },
          assetMap: {},
        }}
      />
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
          edl: tiktokDemoEdl,
          watermark: true,
          accentColor: "#FBBF24",
          captionFontSize: 72,
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
