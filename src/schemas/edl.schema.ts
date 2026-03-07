import { z } from "zod";
import {
  captionStylePacks,
  transitionPacks,
  cameraMotionPacks,
  overlayMotionPacks,
  colorPresets,
} from "../config/stylePacks";

export const CameraMotionPreset = z.enum(cameraMotionPacks);
export const ColorPreset = z.enum(colorPresets);
export const TransitionType = z.enum(transitionPacks);
export const CaptionStylePackId = z.enum(captionStylePacks);
export const OverlayMotionPreset = z.enum(overlayMotionPacks);
export const OverlayPositionPreset = z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center", "full"]);

export const WordTimingSchema = z.object({
  text: z.string(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
});

export const CameraMoveSchema = z.object({
  type: CameraMotionPreset,
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  fromScale: z.number().optional(),
  toScale: z.number().optional(),
  xOffset: z.number().optional(),
  yOffset: z.number().optional(),
  rotation: z.number().optional(),
});

export const PopupSchema = z.object({
  emoji: z.string(),
  timeSec: z.number().min(0),
  durationSec: z.number().min(0).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

export const ClipSchema = z.object({
  id: z.string(),
  src: z.string(),
  trimStartFrame: z.number().int().min(0).default(0),
  durationInFrames: z.number().int().min(1),
  volume: z.number().min(0).max(1).default(1),
  cameraMotionPreset: CameraMotionPreset.default("none"),
  colorPreset: ColorPreset.default("none"),
  zoomTarget: z.number().default(1),
  words: z.array(WordTimingSchema).default([]),
  cameraMoves: z.array(CameraMoveSchema).optional(),
  popups: z.array(PopupSchema).optional(),
  crossfadeFrames: z.number().int().min(0).optional(),
  audioFadeMs: z.number().min(0).optional(),
  transitionType: TransitionType.optional(),
  transitionDurationFrames: z.number().int().min(0).optional(),
});

export const CaptionSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  stylePackId: CaptionStylePackId.default("default"),
  activeWordTimings: z.array(WordTimingSchema).default([]),
});

export const TransitionSchema = z.object({
  type: TransitionType.default("crossfade"),
  atClipIndex: z.number().int().min(0),
  durationInFrames: z.number().int().min(1).default(15),
});

export const OverlaySchema = z.object({
  type: z.enum(["image", "video", "luma", "emoji", "graphic"]),
  src: z.string(),
  startFrame: z.number().int().min(0),
  durationInFrames: z.number().int().min(1),
  positionPreset: OverlayPositionPreset.default("center"),
  motionPreset: OverlayMotionPreset.default("none"),
  opacity: z.number().min(0).max(1).default(1),
  prompt: z.string().optional(),
  mix: z.number().min(0).max(1).optional(),
  transform: z
    .object({
      mode: z.enum(["full", "pip", "overlay"]).default("full"),
      x: z.number().optional(),
      y: z.number().optional(),
      w: z.number().optional(),
      h: z.number().optional(),
      cornerRadius: z.number().optional(),
      shadow: z.boolean().optional(),
    })
    .optional(),
});

export const BrollInsertSchema = z.object({
  id: z.string(),
  src: z.string(),
  startFrame: z.number().int().min(0),
  durationInFrames: z.number().int().min(1),
  type: z.literal("luma"),
  prompt: z.string().min(1).max(500),
  mix: z.number().min(0).max(1).default(1),
  transform: z
    .object({
      mode: z.enum(["full", "pip", "overlay"]).default("full"),
      x: z.number().optional(),
      y: z.number().optional(),
      w: z.number().optional(),
      h: z.number().optional(),
      cornerRadius: z.number().optional(),
      shadow: z.boolean().optional(),
    })
    .optional(),
  audio: z
    .object({
      keepOriginal: z.boolean().default(true),
      lumaAudioGain: z.number().min(0).max(1).default(0),
    })
    .optional(),
});

export const EDLSchema = z.object({
  version: z.literal(2).default(2),
  fps: z.number().int().min(1).max(120).default(30),
  width: z.number().int().min(100).max(3840).default(1080),
  height: z.number().int().min(100).max(2160).default(1920),
  durationInFrames: z.number().int().min(1),
  clips: z.array(ClipSchema),
  captions: z.array(CaptionSegmentSchema).default([]),
  transitions: z.array(TransitionSchema).default([]),
  overlays: z.array(OverlaySchema).default([]),
  musicSrc: z.string().nullable().default(null),
  musicVolume: z.number().min(0).max(1).optional(),
  captionStyleId: z.string().optional(),
  colorGrade: ColorPreset.optional(),
  lumaBroll: z.array(BrollInsertSchema).default([]),
  popups: z.array(PopupSchema).optional(),
  assetMap: z.record(z.string(), z.string()).default({}),
});

export type EDL = z.infer<typeof EDLSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type Overlay = z.infer<typeof OverlaySchema>;
export type BrollInsert = z.infer<typeof BrollInsertSchema>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
export type CameraMove = z.infer<typeof CameraMoveSchema>;
export type Popup = z.infer<typeof PopupSchema>;
