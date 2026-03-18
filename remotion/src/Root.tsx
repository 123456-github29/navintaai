import React from "react";
import { Composition } from "remotion";
import { VideoEditorComposition, schema } from "./VideoEditor";

const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 60; // seconds
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoEditor"
        component={VideoEditorComposition}
        durationInFrames={DEFAULT_DURATION * DEFAULT_FPS}
        fps={DEFAULT_FPS}
        width={DEFAULT_WIDTH}
        height={DEFAULT_HEIGHT}
        schema={schema}
        defaultProps={{
          videoSrc: "",
          cuts: [],
          captions: [],
          filters: [],
          transitions: [],
          segmentTransitions: [],
          brollSegments: [],
          speedAdjustments: [],
          totalDurationInSeconds: DEFAULT_DURATION,
          gradeLook: "none",
          showFilmGrain: false,
          showCinematicBars: false,
          autoTransitions: true,
          defaultTransitionType: "fade",
        }}
      />
    </>
  );
};
