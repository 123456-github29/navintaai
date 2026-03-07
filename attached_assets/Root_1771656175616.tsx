
import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import { EDL } from '../types/edl';

const demo: EDL = {
  fps: 30,
  musicSrc: null,
  clips: [
    {
      id: 'demo',
      src: 'https://www.w3schools.com/html/mov_bbb.mp4',
      trimStartFrame: 0,
      durationInFrames: 300,
      zoomTarget: 1.1,
      words: [],
    },
  ],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NavintaPremium"
    component={MainComposition}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ edl: demo }}
  />
);
