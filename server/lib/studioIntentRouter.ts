import { retryWithBackoff } from "./geminiRetry";
import { chatJSON } from "./openaiClient";
import { z } from "zod";

const OperationSchema = z.object({
  op: z.enum([
    "insert_broll",
    "caption_style",
    "tighten_cuts",
    "add_zooms",
    "transitions",
    "color_grade",
    "remove_broll",
  ]),
  params: z.record(z.string(), z.any()).optional(),
});

const IntentResponseSchema = z.object({
  intent: z.enum([
    "ADD_BROLL",
    "CAPTION_STYLE",
    "TIGHTEN_CUTS",
    "ADD_ZOOMS",
    "TRANSITIONS",
    "COLOR_GRADE",
    "REMOVE_BROLL",
    "MAKE_ENERGETIC",
    "MAKE_CALMER",
    "MULTI",
  ]),
  confidence: z.number().min(0).max(1),
  operations: z.array(OperationSchema),
  notes: z.string(),
});

export type IntentResponse = z.infer<typeof IntentResponseSchema>;
export type Operation = z.infer<typeof OperationSchema>;

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface EDLSummary {
  clipCount: number;
  totalDurationSec: number;
  captionStyleId?: string;
  colorGrade?: string;
  brollCount: number;
  transitionTypes: string[];
  hasZooms: boolean;
}

const SYSTEM_PROMPT = `You are an expert AI video editing assistant. Your job is to interpret the user's natural language editing request and convert it into structured editing operations.

You have access to:
1. The current state of the video's Edit Decision List (EDL) — clips, transitions, captions, color grading, b-roll, zooms
2. The transcript of the video with word-level timing
3. Recent chat history for context

Your task: Given the user's message, determine:
- The primary intent (what they want to change)
- A confidence score (0-1) for how certain you are
- One or more operations to apply
- A brief human-readable note explaining what you'll do

SUPPORTED INTENTS:
- ADD_BROLL: User wants to add b-roll footage (e.g., "add some b-roll", "insert stock footage")
- CAPTION_STYLE: User wants to change caption/subtitle style (e.g., "make captions pop", "change subtitle style")
- TIGHTEN_CUTS: User wants tighter editing, remove dead space (e.g., "tighten cuts", "speed up pacing")
- ADD_ZOOMS: User wants zoom effects (e.g., "add subtle zoom", "zoom on key moments")
- TRANSITIONS: User wants to change transitions (e.g., "smoother transitions", "add fades")
- COLOR_GRADE: User wants color grading changes (e.g., "more cinematic look", "warm tones")
- REMOVE_BROLL: User wants to remove b-roll (e.g., "remove b-roll", "keep only original footage")
- MAKE_ENERGETIC: User wants overall energetic feel (combo: tight cuts + zooms + bold captions)
- MAKE_CALMER: User wants calmer/softer feel (combo: gentle cuts + minimal zoom + soft transitions)
- MULTI: User wants multiple distinct changes

SUPPORTED OPERATIONS:
- insert_broll: params: { prompt: string, timeSec?: number, durationSec?: number }
- caption_style: params: { styleId?: string, fontScale?: number, highlightColor?: string }
- tighten_cuts: params: { aggressiveness: "gentle" | "moderate" | "aggressive" }
- add_zooms: params: { intensity?: number }  (0.0-1.0 scale)
- transitions: params: { type: "fade" | "slide" | "wipe" | "clockWipe" | "flip" | "none", durationFrames?: number }
- color_grade: params: { preset: "none" | "cinematic" | "vintage" | "moody" | "vibrant" | "pastel" }
- remove_broll: params: { insertIds?: string[] }  (empty = remove all)

For MAKE_ENERGETIC, produce operations: tighten_cuts(aggressive) + add_zooms(high) + caption_style(bold)
For MAKE_CALMER, produce operations: tighten_cuts(gentle) + add_zooms(low) + transitions(fade) + color_grade(pastel)

Respond with ONLY valid JSON matching this structure:
{
  "intent": "INTENT_NAME",
  "confidence": 0.95,
  "operations": [{ "op": "operation_name", "params": { ... } }],
  "notes": "Brief explanation of what will be done"
}`;

function buildUserPrompt(
  message: string,
  edlSummary: EDLSummary,
  words: TranscriptWord[],
  chatHistory: ChatMessage[]
): string {
  const transcriptText = words.map((w) => w.text).join(" ").substring(0, 1500);
  const durationSec = edlSummary.totalDurationSec;

  const historyText = chatHistory
    .slice(-5)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return `CURRENT EDL STATE:
- Clips: ${edlSummary.clipCount}
- Duration: ${durationSec}s
- Caption style: ${edlSummary.captionStyleId || "default"}
- Color grade: ${edlSummary.colorGrade || "none"}
- B-roll clips: ${edlSummary.brollCount}
- Transitions: ${edlSummary.transitionTypes.join(", ") || "none"}
- Has zooms: ${edlSummary.hasZooms ? "yes" : "no"}

TRANSCRIPT (first 1500 chars):
"${transcriptText}"

RECENT CHAT:
${historyText || "(no previous messages)"}

USER REQUEST:
"${message}"`;
}

function buildFallbackResponse(message: string): IntentResponse {
  const lower = message.toLowerCase();

  if (lower.includes("b-roll") || lower.includes("broll") || lower.includes("stock footage")) {
    if (lower.includes("remove") || lower.includes("delete") || lower.includes("get rid")) {
      return {
        intent: "REMOVE_BROLL",
        confidence: 0.7,
        operations: [{ op: "remove_broll", params: {} }],
        notes: "Removing b-roll footage",
      };
    }
    return {
      intent: "ADD_BROLL",
      confidence: 0.7,
      operations: [{ op: "insert_broll", params: { prompt: "relevant b-roll footage" } }],
      notes: "Adding b-roll footage based on your request",
    };
  }

  if (lower.includes("caption") || lower.includes("subtitle") || lower.includes("text style")) {
    return {
      intent: "CAPTION_STYLE",
      confidence: 0.7,
      operations: [{ op: "caption_style", params: { fontScale: 1.2 } }],
      notes: "Updating caption style",
    };
  }

  if (lower.includes("tighten") || lower.includes("faster") || lower.includes("speed up") || lower.includes("pacing")) {
    return {
      intent: "TIGHTEN_CUTS",
      confidence: 0.7,
      operations: [{ op: "tighten_cuts", params: { aggressiveness: "moderate" } }],
      notes: "Tightening cuts for faster pacing",
    };
  }

  if (lower.includes("zoom")) {
    return {
      intent: "ADD_ZOOMS",
      confidence: 0.7,
      operations: [{ op: "add_zooms", params: { intensity: 0.5 } }],
      notes: "Adding zoom effects",
    };
  }

  if (lower.includes("transition") || lower.includes("fade")) {
    return {
      intent: "TRANSITIONS",
      confidence: 0.7,
      operations: [{ op: "transitions", params: { type: "fade", durationFrames: 15 } }],
      notes: "Updating transitions",
    };
  }

  if (lower.includes("color") || lower.includes("cinematic") || lower.includes("grade") || lower.includes("look")) {
    return {
      intent: "COLOR_GRADE",
      confidence: 0.7,
      operations: [{ op: "color_grade", params: { preset: "cinematic" } }],
      notes: "Applying color grading",
    };
  }

  if (lower.includes("energetic") || lower.includes("energy") || lower.includes("punch") || lower.includes("dynamic")) {
    return {
      intent: "MAKE_ENERGETIC",
      confidence: 0.7,
      operations: [
        { op: "tighten_cuts", params: { aggressiveness: "aggressive" } },
        { op: "add_zooms", params: { intensity: 0.8 } },
        { op: "caption_style", params: { fontScale: 1.3, highlightColor: "#FF6B00" } },
      ],
      notes: "Making the video more energetic with tight cuts, bold zooms, and punchy captions",
    };
  }

  if (lower.includes("calm") || lower.includes("softer") || lower.includes("gentle") || lower.includes("relaxed")) {
    return {
      intent: "MAKE_CALMER",
      confidence: 0.7,
      operations: [
        { op: "tighten_cuts", params: { aggressiveness: "gentle" } },
        { op: "add_zooms", params: { intensity: 0.1 } },
        { op: "transitions", params: { type: "fade", durationFrames: 20 } },
        { op: "color_grade", params: { preset: "pastel" } },
      ],
      notes: "Making the video calmer with gentle cuts, soft transitions, and pastel tones",
    };
  }

  return {
    intent: "TIGHTEN_CUTS",
    confidence: 0.3,
    operations: [{ op: "tighten_cuts", params: { aggressiveness: "gentle" } }],
    notes: "I wasn't sure what you meant. Applying gentle edits — try being more specific!",
  };
}

function cleanResponseText(text: string): string {
  return text
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

export async function routeStudioIntent(
  message: string,
  edlSummary: EDLSummary,
  words: TranscriptWord[],
  chatHistory: ChatMessage[]
): Promise<IntentResponse> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[studioIntentRouter] No OPENAI_API_KEY, using fallback");
    return buildFallbackResponse(message);
  }

  try {
    const userPrompt = buildUserPrompt(message, edlSummary, words, chatHistory);
    const rawText = await retryWithBackoff(() => chatJSON({
      system: SYSTEM_PROMPT + "\n\nReturn ONLY valid JSON.",
      user: userPrompt,
    }));
    const responseText = cleanResponseText(rawText);

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[studioIntentRouter] No JSON found in AI response");
        return buildFallbackResponse(message);
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const validated = IntentResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[studioIntentRouter] Zod validation failed:", validated.error.message);
      if (parsed.intent && parsed.operations && Array.isArray(parsed.operations)) {
        return {
          intent: parsed.intent,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
          operations: parsed.operations.map((op: any) => ({
            op: op.op || "tighten_cuts",
            params: op.params || {},
          })),
          notes: parsed.notes || "Applying your requested edits",
        };
      }
      return buildFallbackResponse(message);
    }

    console.log(
      `[studioIntentRouter] intent=${validated.data.intent}, confidence=${validated.data.confidence}, ops=${validated.data.operations.length}`
    );

    return validated.data;
  } catch (error: any) {
    console.error(`[studioIntentRouter] Failed: ${error.message}`);
    return buildFallbackResponse(message);
  }
}
