import React, { useMemo } from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill } from "remotion";
import type { EDL, Word } from "../types/edl";
import { SmartVideoClip } from "./SmartVideoClip";
import { KineticCaptions } from "./KineticCaptions";

const TRANSITION_FRAMES = 4;

function localizeWords(words: Word[], trimStartFrame: number): Word[] {
  return words.map((w) => ({
    ...w,
    startFrame: w.startFrame - trimStartFrame,
    endFrame: w.endFrame - trimStartFrame,
  }));
}

export const SmartTimeline: React.FC<{ edl: EDL }> = ({ edl }) => {
  const localizedClips = useMemo(
    () =>
      edl.clips.map((clip) => ({
        ...clip,
        localWords: localizeWords(clip.words, clip.trimStartFrame),
      })),
    [edl.clips]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {localizedClips.map((clip, index) => (
          <React.Fragment key={clip.id}>
            <TransitionSeries.Sequence durationInFrames={clip.durationInFrames}>
              <SmartVideoClip clip={clip} fps={edl.fps} />
              <KineticCaptions words={clip.localWords} clipStartFrame={0} />
            </TransitionSeries.Sequence>

            {index < localizedClips.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
