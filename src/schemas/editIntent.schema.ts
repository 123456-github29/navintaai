import { z } from "zod";

export const EditIntentSchema = z.object({
  wantCaptions: z.boolean().default(false),
  wantBroll: z.boolean().default(false),
  wantColorGrade: z.boolean().default(false),
  wantZooms: z.boolean().default(false),
  wantTransitions: z.boolean().default(false),
  wantTightenCuts: z.boolean().default(false),
  wantMusic: z.boolean().default(false),
  wantOverlays: z.boolean().default(false),
  mood: z.enum(["energetic", "calm", "cinematic", "neutral", "dramatic", "playful"]).default("neutral"),
  captionStyle: z.string().optional(),
  colorPreset: z.string().optional(),
  transitionType: z.string().optional(),
  zoomIntensity: z.number().min(0).max(1).optional(),
  cutAggressiveness: z.enum(["gentle", "moderate", "aggressive"]).optional(),
  brollPrompts: z.array(z.string()).optional(),
  freeformNote: z.string().optional(),
});

export type EditIntent = z.infer<typeof EditIntentSchema>;
