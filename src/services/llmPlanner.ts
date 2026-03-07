import { chatJSON } from "../../server/lib/openaiClient";
import { EditPlanSchema, type EditPlan } from "../schemas/editPlan.schema";
import type { EditIntent } from "../schemas/editIntent.schema";
import type { TimelineData } from "./timelineExtractor";
import { captionStylePacks, transitionPacks, cameraMotionPacks, colorPresets } from "../config/stylePacks";

const SYSTEM_PROMPT = `You are an expert AI video editor. Given the user's editing intent and the video timeline data, produce a detailed EditPlan JSON.

AVAILABLE STYLE PACKS:
- Caption styles: ${captionStylePacks.join(", ")}
- Transition types: ${transitionPacks.join(", ")}
- Camera motions: ${cameraMotionPacks.join(", ")}
- Color presets: ${colorPresets.join(", ")}

OUTPUT FORMAT (strict JSON):
{
  "clipCuts": [{ "sourceClipIndex": 0, "trimStartMs": 0, "durationMs": 5000, "label": "intro" }],
  "cameraMoves": [{ "clipIndex": 0, "motion": "slow-zoom-in", "intensity": 0.5 }],
  "transitions": [{ "atClipIndex": 1, "type": "crossfade", "durationMs": 500 }],
  "captionPlan": { "stylePackId": "default", "enabled": true },
  "brollSlots": [{ "query": "city skyline", "afterClipIndex": 0, "durationMs": 3000, "source": "pexels" }],
  "graphicsSlots": [],
  "colorPreset": "none",
  "musicQuery": null
}

RULES:
- clipCuts: If wantTightenCuts is true, produce cuts that remove long pauses. Use suggestedCuts from timeline.
- cameraMoves: If wantZooms is true, add camera motions. Match mood (cinematic=slow-zoom-in, energetic=zoom_in).
- transitions: If wantTransitions is true, add transitions between clips. Match mood.
- captionPlan: If wantCaptions is true, pick a style matching the mood.
- brollSlots: If wantBroll is true, suggest 1-3 relevant b-roll queries based on transcript content.
- colorPreset: If wantColorGrade is true, pick a color preset matching the mood.
- Only include fields the user asked for; leave others at defaults.
- clipCuts array can be empty if no cutting is requested (keeps original single clip).

Return ONLY valid JSON.`;

function buildUserPrompt(intent: EditIntent, timeline: TimelineData): string {
  const transcriptPreview = timeline.words
    .slice(0, 100)
    .map((w) => w.text)
    .join(" ");

  return `INTENT:
${JSON.stringify(intent, null, 2)}

TIMELINE:
- FPS: ${timeline.fps}
- Total duration: ${timeline.totalDurationMs}ms
- Word count: ${timeline.words.length}
- Pauses found: ${timeline.pauses.length}
- Suggested cuts: ${timeline.suggestedCuts.length}
- Suggested cut points (ms): ${timeline.suggestedCuts.slice(0, 10).map((c) => `${c.atMs}(${c.reason})`).join(", ")}
- Pause durations (ms): ${timeline.pauses.slice(0, 10).map((p) => p.durationMs).join(", ")}

TRANSCRIPT PREVIEW:
"${transcriptPreview}"

${intent.freeformNote ? `USER NOTE: "${intent.freeformNote}"` : ""}`;
}

function buildFallbackPlan(intent: EditIntent): EditPlan {
  return {
    clipCuts: [],
    cameraMoves: intent.wantZooms
      ? [{ clipIndex: 0, motion: "slow-zoom-in", intensity: intent.zoomIntensity ?? 0.5 }]
      : [],
    transitions: intent.wantTransitions
      ? [{ atClipIndex: 0, type: intent.transitionType as any || "crossfade", durationMs: 500 }]
      : [],
    captionPlan: {
      stylePackId: intent.captionStyle as any || "default",
      enabled: intent.wantCaptions,
    },
    brollSlots: intent.wantBroll && intent.brollPrompts
      ? intent.brollPrompts.map((query, i) => ({
          query,
          afterClipIndex: i,
          durationMs: 3000,
          source: "pexels" as const,
        }))
      : [],
    graphicsSlots: [],
    colorPreset: (intent.colorPreset as any) || "none",
  };
}

export async function generateEditPlan(
  intent: EditIntent,
  timeline: TimelineData
): Promise<EditPlan> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[llmPlanner] No OPENAI_API_KEY, using fallback plan");
    return buildFallbackPlan(intent);
  }

  try {
    const userPrompt = buildUserPrompt(intent, timeline);
    const rawResponse = await chatJSON({
      system: SYSTEM_PROMPT,
      user: userPrompt,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("[llmPlanner] No JSON found in response, using fallback");
        return buildFallbackPlan(intent);
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const validated = EditPlanSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[llmPlanner] Validation failed:", validated.error.message);
      const partial = parsed as Record<string, unknown>;
      return EditPlanSchema.parse({
        clipCuts: partial.clipCuts || [],
        cameraMoves: partial.cameraMoves || [],
        transitions: partial.transitions || [],
        captionPlan: partial.captionPlan || { stylePackId: "default", enabled: true },
        brollSlots: partial.brollSlots || [],
        graphicsSlots: partial.graphicsSlots || [],
        colorPreset: partial.colorPreset || "none",
        musicQuery: partial.musicQuery || undefined,
      });
    }

    return validated.data;
  } catch (error: any) {
    console.error(`[llmPlanner] Failed: ${error.message}`);
    return buildFallbackPlan(intent);
  }
}
