
export interface Word {
  text: string;
  startMs: number;
  endMs: number;
  startFrame: number;
  endFrame: number;
}

export interface Clip {
  id: string;
  src: string;
  trimStartFrame: number;
  durationInFrames: number;
  zoomTarget: number;
  words: Word[];
}

export interface EDL {
  fps: number;
  clips: Clip[];
  musicSrc: string | null;
}
