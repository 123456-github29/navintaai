export type CaptionAnimationType = "none" | "pop-in" | "karaoke" | "fade-in" | "typewriter";

export interface WordTiming {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface CaptionSegment {
  id: string;
  text: string;
  startFrame: number;
  endFrame: number;
  stylePackId?: string;
  animationType?: CaptionAnimationType;
  words?: WordTiming[];
  position?: string;
  safeMargin?: number;
}
