
import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { crossfade } from '@remotion/transitions/crossfade';
import { AbsoluteFill } from 'remotion';
import { EDL } from '../types/edl';
import { SmartVideoClip } from './SmartVideoClip';
import { KineticCaptions } from './KineticCaptions';

export const Timeline: React.FC<{ edl: EDL }> = ({ edl }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <TransitionSeries>
        {edl.clips.map((clip, index) => (
          <React.Fragment key={clip.id}>
            <TransitionSeries.Sequence durationInFrames={clip.durationInFrames}>
              <SmartVideoClip clip={clip} fps={edl.fps} />
              <KineticCaptions words={clip.words} clipStartFrame={clip.trimStartFrame} />
            </TransitionSeries.Sequence>

            {index < edl.clips.length - 1 && (
              <TransitionSeries.Transition
                presentation={crossfade()}
                timing={linearTiming({ durationInFrames: 4 })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
