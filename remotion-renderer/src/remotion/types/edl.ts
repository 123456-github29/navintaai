export interface Word {
  text: string;
  startMs: number;
  endMs: number;
  startFrame: number;
  endFrame: number;
}

export type TransitionType = "fade" | "slide" | "wipe" | "clockWipe" | "flip" | "none";

export type CameraMoveType =
  | "zoom_in" | "zoom_out"
  | "pan_left" | "pan_right" | "pan_up" | "pan_down"
  | "tilt_up" | "tilt_down"
  | "rotate_cw" | "rotate_ccw"
  | "dolly_in" | "dolly_out"
  | "tracking";

export interface CameraMove {
  type: CameraMoveType;
  startSec: number;
  endSec: number;
  fromScale?: number;
  toScale?: number;
  xOffset?: number;
  yOffset?: number;
  rotation?: number;
}

export interface Popup {
  emoji: string;
  timeSec: number;
  durationSec?: number;
  positionX?: number;
  positionY?: number;
}

export type ColorGradePreset = "none" | "cinematic" | "vintage" | "moody" | "vibrant" | "pastel";

export interface BrollOverlay {
  src: string;
  startFrame: number;
  durationInFrames: number;
  opacity?: number;
}

export interface BrollInsert {
  id: string;
  src: string;
  startFrame: number;
  durationInFrames: number;
  type: 'luma';
  prompt: string;
  mix: number;
  transform?: {
    mode: 'full' | 'pip' | 'overlay';
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    cornerRadius?: number;
    shadow?: boolean;
  };
  audio?: {
    keepOriginal: boolean;
    lumaAudioGain?: number;
  };
}

export interface Clip {
  id: string;
  src: string;
  trimStartFrame: number;
  durationInFrames: number;
  zoomTarget: number;
  words: Word[];
  cameraMoves?: CameraMove[];
  popups?: Popup[];
  crossfadeFrames?: number;
  audioFadeMs?: number;
  transitionType?: TransitionType;
  transitionDurationFrames?: number;
}

export interface EDL {
  fps: number;
  clips: Clip[];
  musicSrc: string | null;
  popups?: Popup[];
  captionStyleId?: string;
  colorGrade?: ColorGradePreset;
  musicVolume?: number;
  brollOverlays?: BrollOverlay[];
  lumaBroll?: BrollInsert[];
}
