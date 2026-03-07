import { z } from "zod";

export const CameraMotionPreset = z.enum(["none", "slow-zoom-in", "slow-zoom-out", "pan-left", "pan-right"]);

export const ColorPreset = z.enum(["none", "warm", "cool", "vintage", "noir", "vivid"]);

export const CaptionAnimationType = z.enum(["none", "pop-in", "karaoke", "fade-in", "typewriter"]);

export const TransitionType = z.enum(["crossfade", "blur-dissolve", "cut"]);

export const CaptionPosition = z.enum(["top", "middle", "bottom"]);

const WordTimingSchema = z.object({
  text: z.string(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
});

const VideoSegmentSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  trimStart: z.number().int().min(0).default(0),
  volume: z.number().min(0).max(1).default(1),
  cameraMotion: CameraMotionPreset.default("none"),
  colorPreset: ColorPreset.default("none"),
}).refine((seg) => seg.endFrame > seg.startFrame, {
  message: "endFrame must be greater than startFrame",
});

const CaptionSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  stylePackId: z.string().default("default"),
  animationType: CaptionAnimationType.default("none"),
  words: z.array(WordTimingSchema).optional(),
  position: CaptionPosition.optional(),
  safeMargin: z.number().optional(),
}).refine((cap) => cap.endFrame > cap.startFrame, {
  message: "endFrame must be greater than startFrame",
});

const TransitionSchema = z.object({
  id: z.string(),
  type: TransitionType.default("crossfade"),
  atFrame: z.number().int().min(0),
  durationFrames: z.number().int().min(1).default(15),
});

const AudioSegmentSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  trimStart: z.number().int().min(0).default(0),
  volume: z.number().min(0).max(1).default(1),
}).refine((seg) => seg.endFrame > seg.startFrame, {
  message: "endFrame must be greater than startFrame",
});

const TracksSchema = z.object({
  video: z.array(VideoSegmentSchema),
  captions: z.array(CaptionSegmentSchema).default([]),
  transitions: z.array(TransitionSchema).default([]),
  audio: z.array(AudioSegmentSchema).default([]),
});

export const BrollInsertSchema = z.object({
  id: z.string(),
  src: z.string(),
  startFrame: z.number().int().min(0),
  durationInFrames: z.number().int().min(1),
  type: z.literal('luma'),
  prompt: z.string().min(1).max(500),
  mix: z.number().min(0).max(1).default(1),
  transform: z.object({
    mode: z.enum(['full', 'pip', 'overlay']).default('full'),
    x: z.number().optional(),
    y: z.number().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
    cornerRadius: z.number().optional(),
    shadow: z.boolean().optional(),
  }).optional(),
  audio: z.object({
    keepOriginal: z.boolean().default(true),
    lumaAudioGain: z.number().min(0).max(1).default(0),
  }).optional(),
});

export type BrollInsert = z.infer<typeof BrollInsertSchema>;

export const EditDecisionSchema = z.object({
  version: z.literal(1).default(1),
  fps: z.number().int().min(1).max(120).default(30),
  width: z.number().int().min(100).max(3840).default(1080),
  height: z.number().int().min(100).max(2160).default(1920),
  durationInFrames: z.number().int().min(1),
  tracks: TracksSchema,
  assetMap: z.record(z.string(), z.string()),
});

export type EditDecision = z.infer<typeof EditDecisionSchema>;
export type VideoSegment = z.infer<typeof VideoSegmentSchema>;
export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type AudioSegment = z.infer<typeof AudioSegmentSchema>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
