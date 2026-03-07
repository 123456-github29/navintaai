export interface Word {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  words: Word[];
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability?: number;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: WhisperWord[];
}

export interface WhisperTranscript {
  text: string;
  segments: WhisperSegment[];
  language: string;
}

export type HighlightMode = "word-highlight" | "word-pop" | "underline-sweep" | "pill-glow" | "karaoke-fill";
export type BackgroundMode = "none" | "pill" | "box" | "glass";
export type CaptionPosition = "top" | "middle" | "bottom";
export type TemplateCategory = "minimal" | "bold" | "neon" | "outline" | "karaoke" | "classic";

export interface CaptionStyle {
  id: string;
  name: string;
  category: TemplateCategory;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  textColor: string;
  activeColor: string;
  inactiveColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadow: string;
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  highlightMode: HighlightMode;
  wordSpacing: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface CaptionSettings {
  presetId: string;
  fontSize: number;
  lineCount: 1 | 2;
  position: CaptionPosition;
  safeMargin: number;
  uppercase: boolean;
  stroke: boolean;
  shadowEnabled: boolean;
}

export interface TimelineState {
  activeSegmentIndex: number;
  activeWordIndex: number;
  wordProgress: number;
  segment: CaptionSegment | null;
}
