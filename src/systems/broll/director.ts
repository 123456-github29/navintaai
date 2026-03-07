import OpenAI from "openai";
import type {
  DirectorRequest,
  DirectorResponse,
  TranscriptSegment,
  VideoContext,
  DirectorRules,
  BrollSlot,
} from "./contracts";
import {
  DirectorRequestSchema,
  BrollSlotSchema,
} from "./contracts";

function sanitizeForOpenAI(text: string): string {
  if (!text) return "";
  const replacements: Record<string, string> = {
    '\u2018': "'", '\u2019': "'", '\u201C': '"', '\u201D': '"',
    '\u2014': '-', '\u2013': '-', '\u2026': '...', '\u2028': '\n',
    '\u2029': '\n', '\u00A0': ' ', '\u2022': '-', '\u2192': '->',
    '\u2190': '<-',
  };
  let result = text.normalize("NFC");
  for (const [char, replacement] of Object.entries(replacements)) {
    result = result.split(char).join(replacement);
  }
  let finalResult = '';
  for (let i = 0; i < result.length; i++) {
    const code = result.charCodeAt(i);
    if (code <= 255) {
      finalResult += result[i];
    }
  }
  return finalResult;
}

const DIRECTOR_SYSTEM_PROMPT = `You are an expert "Director System" for an AI video editor. Your job is to read a video transcript (with word-level timestamps) and produce B-ROLL SLOTS ONLY. You do NOT choose actual B-roll clips, you do NOT render, and you do NOT do final editing. You only decide WHERE b-roll should appear and WHAT it should show (intent + constraints). This output will be consumed by a separate B-roll retrieval system.

SCOPE (IMPORTANT)
- Output ONLY BrollSlot[] JSON that conforms to the schema below.
- Do NOT include any other commentary, explanations, or extra fields.
- Do NOT output clip URLs. Do NOT output provider names. Do NOT output final EDL.
- No auto-zoom, no cuts, no sound design. Only B-roll slot planning.

OUTPUT SCHEMA (MUST MATCH EXACTLY)
Return JSON:
{
  "slots": BrollSlot[]
}

BrollSlot:
{
  "slotId": string,
  "startMs": number,
  "endMs": number,
  "durationTargetMs": number,
  "purpose": "example" | "explain" | "contrast" | "mood" | "transition" | "emphasis",
  "intent": {
    "entities": string[],
    "actions": string[],
    "keywords": string[],
    "visualEnergy": "static" | "dynamic" | "cinematic",
    "query": string
  },
  "styleConstraints": {
    "cropMode": "9:16-safe" | "any",
    "matchColorMood": "warm" | "cool" | "neutral",
    "cameraStyle": "stable" | "handheld" | "action" | "any",
    "avoidTags": string[],
    "preferTags": string[],
    "minResolution": { "width": number, "height": number }
  },
  "priority": number
}

DIRECTOR BEHAVIOR RULES (MUST FOLLOW)
1) You are planning B-roll slots for a final edit. B-roll should be used sparingly and intentionally.
2) Only create a slot when it improves clarity, visual interest, or pacing:
   - demonstrations/examples ("for example", "like", "imagine", "this is", "look at")
   - concrete nouns and scenes (cities, products, tools, sports, vehicles, foods, UI/app screens)
   - lists and steps (Step 1/2/3)
   - claims that need illustration ("this increased 3x", "in 2019", "a massive storm")
3) DO NOT place B-roll on:
   - emotionally sensitive confession moments
   - direct calls-to-action ("subscribe", "link in bio") unless directorRules prefer it
   - the hook's most important face-on moment (first ~700ms) unless it's an illustrative cold open
4) Timing:
   - Use segment boundaries where possible.
   - Start B-roll slightly AFTER the keyword is spoken (reaction buffer): 100-250ms.
   - Typical slot durations:
     - fast pacing: 900-2200ms
     - medium: 1500-3500ms
     - slow/cinematic: 2500-5000ms
   - Respect directorRules min/max duration and spacing.
5) Frequency:
   - Obey maxBrollSlotsPerMinute and minGapMsBetweenSlots.
   - Prefer fewer high-quality slots over many.
6) Query construction:
   - Queries must be stock-footage-friendly and general.
   - Avoid copyrighted / overly specific celebrity footage requests.
   - If an entity is a famous person and stock footage likely won't exist, translate intent into general visuals.
   - Always include at least one broad category keyword.
7) Visual energy mapping:
   - "dynamic" for action, sports, movement, excitement
   - "cinematic" for mood, landscapes, slow storytelling, dramatic moments
   - "static" for calm explanations, product close-ups, diagrams, UI screens

OUTPUT FORMAT REQUIREMENTS
- Output ONLY valid JSON with the exact top-level key: "slots"
- No markdown, no explanations, no extra text.`;

function buildDefaultRules(pacing: string): DirectorRules {
  switch (pacing) {
    case "fast":
      return {
        maxBrollSlotsPerMinute: 6,
        minGapMsBetweenSlots: 3500,
        maxSlotDurationMs: 3500,
        minSlotDurationMs: 900,
        preferBrollOn: "all" as const,
      };
    case "slow":
      return {
        maxBrollSlotsPerMinute: 2,
        minGapMsBetweenSlots: 7000,
        maxSlotDurationMs: 8000,
        minSlotDurationMs: 1500,
        preferBrollOn: "all" as const,
      };
    default:
      return {
        maxBrollSlotsPerMinute: 4,
        minGapMsBetweenSlots: 5000,
        maxSlotDurationMs: 5000,
        minSlotDurationMs: 1200,
        preferBrollOn: "all" as const,
      };
  }
}

function buildUserPrompt(
  segments: TranscriptSegment[],
  context: VideoContext,
  rules: DirectorRules
): string {
  return JSON.stringify({
    transcriptSegments: segments,
    videoContext: context,
    directorRules: rules,
  });
}

function computeTotalDurationMs(segments: TranscriptSegment[]): number {
  if (segments.length === 0) return 0;
  const maxEnd = Math.max(...segments.map((s) => s.endMs));
  const minStart = Math.min(...segments.map((s) => s.startMs));
  return maxEnd - minStart;
}

function enforceRules(
  slots: BrollSlot[],
  totalDurationMs: number,
  rules: DirectorRules,
  transcriptMinMs: number,
  transcriptMaxMs: number
): BrollSlot[] {
  const sorted = [...slots].sort((a, b) => a.startMs - b.startMs);

  const maxSlots = Math.ceil(
    (totalDurationMs / 60000) * rules.maxBrollSlotsPerMinute
  );

  const enforced: BrollSlot[] = [];
  let lastEndMs = -Infinity;

  for (const slot of sorted) {
    if (enforced.length >= maxSlots) break;

    let startMs = Math.max(slot.startMs, transcriptMinMs);
    let endMs = Math.min(slot.endMs, transcriptMaxMs);
    if (endMs <= startMs) continue;

    const gap = startMs - lastEndMs;
    if (gap < rules.minGapMsBetweenSlots && enforced.length > 0) continue;

    let duration = endMs - startMs;
    if (duration < rules.minSlotDurationMs) continue;

    if (duration > rules.maxSlotDurationMs) {
      endMs = startMs + rules.maxSlotDurationMs;
      duration = rules.maxSlotDurationMs;
    }

    const adjustedSlot = {
      ...slot,
      startMs,
      endMs,
      durationTargetMs: duration,
    } as BrollSlot;

    enforced.push(adjustedSlot);
    lastEndMs = adjustedSlot.endMs;
  }

  return enforced;
}

export async function generateBrollSlots(
  request: DirectorRequest
): Promise<DirectorResponse> {
  const parsed = DirectorRequestSchema.parse(request);
  const { transcriptSegments, videoContext, directorRules } = parsed;

  const rules = directorRules || buildDefaultRules(videoContext.pacing);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({
    apiKey,
  });

  const userPrompt = sanitizeForOpenAI(
    buildUserPrompt(transcriptSegments, videoContext, rules)
  );

  const model = "gpt-4o";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("No response from AI model");
  }

  let parsed_json: { slots: unknown[] };
  try {
    parsed_json = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  if (!Array.isArray(parsed_json.slots)) {
    throw new Error("AI response missing 'slots' array");
  }

  const validSlots: BrollSlot[] = [];
  for (const rawSlot of parsed_json.slots) {
    const result = BrollSlotSchema.safeParse(rawSlot);
    if (result.success) {
      validSlots.push(result.data);
    }
  }

  const totalDurationMs = computeTotalDurationMs(transcriptSegments);
  const transcriptMinMs = Math.min(...transcriptSegments.map((s) => s.startMs));
  const transcriptMaxMs = Math.max(...transcriptSegments.map((s) => s.endMs));
  const finalSlots = enforceRules(validSlots, totalDurationMs, rules, transcriptMinMs, transcriptMaxMs);

  return {
    slots: finalSlots,
    meta: {
      totalDurationMs,
      slotsGenerated: finalSlots.length,
      model,
    },
  };
}
