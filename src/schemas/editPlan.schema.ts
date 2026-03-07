import { z } from "zod";
import {
  captionStylePacks,
  transitionPacks,
  cameraMotionPacks,
  colorPresets,
} from "../config/stylePacks";

export const ClipCutSchema = z.object({
  sourceClipIndex: z.number().int().min(0),
  trimStartMs: z.number().min(0),
  durationMs: z.number().min(0),
  label: z.string().optional(),
});

export const CameraMoveplanSchema = z.object({
  clipIndex: z.number().int().min(0),
  motion: z.enum(cameraMotionPacks),
  intensity: z.number().min(0).max(1).default(0.5),
});

export const TransitionPlanSchema = z.object({
  atClipIndex: z.number().int().min(0),
  type: z.enum(transitionPacks),
  durationMs: z.number().min(0).default(500),
});

export const CaptionPlanSchema = z.object({
  stylePackId: z.enum(captionStylePacks).default("default"),
  enabled: z.boolean().default(true),
});

export const BrollSlotSchema = z.object({
  query: z.string(),
  afterClipIndex: z.number().int().min(0),
  durationMs: z.number().min(500).default(3000),
  source: z.enum(["pexels", "luma"]).default("pexels"),
});

export const GraphicsSlotSchema = z.object({
  type: z.enum(["emoji", "lower-third", "title-card", "graphic"]),
  content: z.string(),
  atMs: z.number().min(0),
  durationMs: z.number().min(0).default(2000),
});

export const EditPlanSchema = z.object({
  clipCuts: z.array(ClipCutSchema).default([]),
  cameraMoves: z.array(CameraMoveplanSchema).default([]),
  transitions: z.array(TransitionPlanSchema).default([]),
  captionPlan: CaptionPlanSchema.default({ stylePackId: "default", enabled: true }),
  brollSlots: z.array(BrollSlotSchema).default([]),
  graphicsSlots: z.array(GraphicsSlotSchema).default([]),
  colorPreset: z.enum(colorPresets).default("none"),
  musicQuery: z.string().optional(),
});

export type EditPlan = z.infer<typeof EditPlanSchema>;
export type ClipCut = z.infer<typeof ClipCutSchema>;
export type CameraMovePlan = z.infer<typeof CameraMoveplanSchema>;
export type TransitionPlan = z.infer<typeof TransitionPlanSchema>;
export type CaptionPlan = z.infer<typeof CaptionPlanSchema>;
export type BrollSlot = z.infer<typeof BrollSlotSchema>;
export type GraphicsSlot = z.infer<typeof GraphicsSlotSchema>;
