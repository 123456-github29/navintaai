export const captionStylePacks = [
  "default",
  "kinetic_bounce",
  "cinematic_plate",
  "impact_flash",
  "karaoke_glow",
  "minimal_fade",
  "bold_stack",
  "neon_outline",
] as const;

export type CaptionStylePackId = (typeof captionStylePacks)[number];

export const transitionPacks = [
  "cut",
  "crossfade",
  "blur-dissolve",
  "fade",
  "slide",
  "wipe",
  "clockWipe",
  "flip",
  "none",
] as const;

export type TransitionPackId = (typeof transitionPacks)[number];

export const cameraMotionPacks = [
  "none",
  "slow-zoom-in",
  "slow-zoom-out",
  "pan-left",
  "pan-right",
  "pan-up",
  "pan-down",
  "tilt-up",
  "tilt-down",
  "zoom_in",
  "zoom_out",
  "dolly_in",
  "dolly_out",
  "tracking",
  "rotate_cw",
  "rotate_ccw",
] as const;

export type CameraMotionPackId = (typeof cameraMotionPacks)[number];

export const overlayMotionPacks = [
  "none",
  "fade-in",
  "slide-up",
  "slide-down",
  "pop-in",
  "float",
  "ken-burns",
] as const;

export type OverlayMotionPackId = (typeof overlayMotionPacks)[number];

export const colorPresets = [
  "none",
  "warm",
  "cool",
  "vintage",
  "noir",
  "vivid",
  "cinematic",
  "moody",
  "vibrant",
  "pastel",
] as const;

export type ColorPresetId = (typeof colorPresets)[number];
