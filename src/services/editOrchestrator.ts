import type { EditIntent } from "../schemas/editIntent.schema";
import type { EDL } from "../schemas/edl.schema";
import type { EditPlan } from "../schemas/editPlan.schema";
import { extractTimeline, type TranscriptWord } from "./timelineExtractor";
import { generateEditPlan } from "./llmPlanner";
import { buildEDL } from "./edlBuilder";
import { executePexelsBrollBest } from "./apiExecutors/pexels.executor";

export interface OrchestratorInput {
  videoSrc: string;
  fps?: number;
  transcript: Array<{ text: string; start: number; end: number }>;
  intent: EditIntent;
  currentEdl?: EDL;
}

export interface OrchestratorResult {
  edl: EDL;
  plan: EditPlan;
  assetMap: Record<string, string>;
  notes: string[];
}

export async function orchestrateEdit(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  const { videoSrc, transcript, intent, currentEdl } = input;
  const fps = input.fps || currentEdl?.fps || 30;
  const notes: string[] = [];

  const timeline = extractTimeline(transcript, fps);
  notes.push(`Timeline: ${timeline.words.length} words, ${timeline.pauses.length} pauses, ${timeline.suggestedCuts.length} suggested cuts`);

  const plan = await generateEditPlan(intent, timeline);
  notes.push(`Plan: ${plan.clipCuts.length} cuts, ${plan.cameraMoves.length} camera moves, ${plan.brollSlots.length} b-roll slots`);

  const assetMap: Record<string, string> = {};

  if (plan.brollSlots.length > 0) {
    const brollResults = await Promise.allSettled(
      plan.brollSlots.map(async (slot) => {
        try {
          const result = await executePexelsBrollBest(slot.query);
          if (result) {
            assetMap[`broll-${slot.query}`] = result.url;
            notes.push(`B-roll found for "${slot.query}"`);
          } else {
            notes.push(`No b-roll found for "${slot.query}"`);
          }
        } catch (err: any) {
          notes.push(`B-roll search failed for "${slot.query}": ${err.message}`);
        }
      })
    );
  }

  const totalDurationMs = timeline.totalDurationMs || (currentEdl
    ? currentEdl.clips.reduce((s, c) => s + (c.durationInFrames / fps) * 1000, 0)
    : 0);

  const edl = buildEDL({
    videoSrc,
    fps,
    totalDurationMs,
    words: timeline.words,
    plan,
    assetMap,
  });

  notes.push(`EDL built: ${edl.clips.length} clips, ${edl.captions.length} captions, ${edl.durationInFrames} frames`);

  return { edl, plan, assetMap, notes };
}
