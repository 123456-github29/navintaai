import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";
import { utf8Safe } from "../utils/utf8Safe";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LUMA_API_KEY = process.env.LUMA_API_KEY || "";

// ---- Whisper Transcription ----

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptSegment[];
  language: string;
  duration: number;
}

export async function transcribeVideo(filePath: string): Promise<TranscriptionResult> {
  const fileStream = await fs.readFile(filePath);
  const file = new File([fileStream], path.basename(filePath), {
    type: filePath.endsWith(".webm") ? "video/webm" : "video/mp4",
  });

  let response;
  try {
    response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });
  } catch (err: any) {
    console.error("[transcribe] OpenAI Whisper API error:", err?.message || err);
    throw new Error(`Transcription failed: ${err?.message || "OpenAI API error"}`);
  }

  if (!response || !response.text) {
    throw new Error("Transcription returned empty result");
  }

  const segments: TranscriptSegment[] = (response as any).segments?.map((seg: any) => ({
    start: seg.start,
    end: seg.end,
    text: utf8Safe(seg.text?.trim()),
  })) || [];

  return {
    fullText: utf8Safe(response.text),
    segments,
    language: (response as any).language || "en",
    duration: (response as any).duration || 0,
  };
}

// ---- OpenAI Edit Planning ----

export interface EditOperation {
  type: string;
  params: Record<string, any>;
  status: string;
}

export interface EditPlanResult {
  message: string;
  operations: EditOperation[];
}

const EDIT_SYSTEM_PROMPT = `You are an expert video editor AI. Users describe edits in natural language and you translate them into precise editing operations. Be creative and proactive — if the user says "make it look professional", combine multiple operations (filters, captions, transitions). If they say something vague, pick the best interpretation and explain what you did.

AVAILABLE OPERATIONS:

1. **cut** — Remove a time range from the video. Params: { start: number (seconds), end: number (seconds) }
   Use for: "remove the pause at 5 seconds", "cut deadspace", "trim the beginning", "remove ums and ahs", "cut the first 3 seconds", "remove silent parts"
   To cut deadspace/silence: analyze the transcript for pauses (gaps between segments) and generate a cut for each gap.

2. **speed_change** — Change playback speed for a segment. Params: { start: number, end: number, speed: number (0.25-4.0) }
   Use for: "speed up the boring parts", "slow motion on the exciting part", "make it faster", "2x speed"

3. **add_caption** — Add auto-generated captions from the transcript. Params: { style?: "viral"|"boxed"|"cinematic"|"neon"|"gradient"|"highlighted"|"outline"|"default", position?: "bottom"|"top"|"center" }
   Styles:
   - "viral" = CapCut-style word-by-word yellow highlight (DEFAULT — use when unspecified, or user says "bold", "CapCut", "TikTok style")
   - "boxed" = white text on dark box
   - "cinematic" = frosted glass with border
   - "neon" = glowing cyan neon text
   - "gradient" = colorful gradient pill background
   - "highlighted" = word-by-word highlight similar to viral
   - "outline" = big white text with black stroke, no background
   - "default" = clean white text with shadow
   Map user intent: "clean" → "default", "glow" → "neon", "movie look" → "cinematic", "colorful" → "gradient"

4. **add_music** — Add background music. Params: { style: string, volume: number (0-1) }
   Use for: "add music", "add a chill beat", "background music"

5. **add_filter** — Apply visual filters/color grading. Params: { type: "brightness"|"contrast"|"saturation"|"blur"|"sharpen"|"vintage"|"cinematic"|"warm"|"cool", value: number (0-2), start?: number, end?: number }
   Use for: "make it cinematic", "add a warm look", "vintage filter", "make it brighter", "color grade it"

6. **add_transition** — Add a transition effect at a timestamp. Params: { type: "fade"|"dissolve"|"wipe"|"zoom"|"flash"|"glitch", timestamp: number, duration: number (0.3-2.0) }
   Use for: "add transitions", "fade in", "add a glitch effect"

7. **add_broll** — Insert AI-generated B-roll footage via Luma AI. Params: { query: string, timestamp: number, duration: number (2-10) }
   Use for: "add b-roll", "add stock footage", "insert relevant clips", "add visuals"
   The query will be used as a Luma AI generation prompt, so make it descriptive and cinematic (e.g., "a monkey swinging through jungle vines, cinematic lighting" not just "monkey")

8. **luma_generate** — Generate a cinematic AI clip. Params: { prompt: string, duration: number (3-10), timestamp: number, aspect_ratio?: "16:9"|"9:16"|"1:1" }
   Use for: "generate an intro", "AI clip", "create a cinematic shot"

RESPONSE FORMAT — always return valid JSON (no markdown):
{
  "message": "Brief, friendly explanation of what you're doing",
  "operations": [{ "type": "...", "params": { ... } }]
}

RULES:
- ALWAYS generate at least one operation when the user requests an edit. Never return an empty operations array for an edit request.
- Use the transcript to make intelligent timing decisions. Place cuts/transitions at natural speech boundaries.
- For "cut deadspace" or "remove silence": find gaps in the transcript segments (where end of one segment and start of next have a gap > 0.5s) and create a cut operation for each gap.
- For "make it viral/professional/cinematic": combine multiple operations (add_caption + add_filter + add_transition).
- You can apply multiple operations in a single response.
- If the user asks something unrelated to video editing, still respond with a helpful message but with an empty operations array.
- Timestamps must be within 0 and the video duration. Round to 1 decimal place.`;

export async function planEdits(
  userMessage: string,
  transcript: string,
  currentEditState: any,
  chatHistory: Array<{ role: string; content: string }>,
  videoDuration: number,
): Promise<EditPlanResult> {
  const contextMessage = `Video transcript: "${transcript}"
Video duration: ${videoDuration} seconds
Current edit state: ${JSON.stringify(currentEditState || {})}

User request: ${userMessage}`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: EDIT_SYSTEM_PROMPT },
  ];

  // Include recent chat history for context (last 10 messages)
  const recentHistory = chatHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: contextMessage });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      message: "I had trouble understanding that request. Could you rephrase it?",
      operations: [],
    };
  }

  return {
    message: parsed.message || "Edit applied.",
    operations: (parsed.operations || []).map((op: any) => ({
      type: op.type,
      params: op.params || {},
      status: "pending",
    })),
  };
}

// ---- Luma AI Video Generation ----

export interface LumaGenerationResult {
  id: string;
  status: string;
  videoUrl?: string;
}

export async function generateLumaVideo(
  prompt: string,
  duration: number = 5,
  aspectRatio: string = "9:16",
): Promise<LumaGenerationResult> {
  if (!LUMA_API_KEY) {
    return {
      id: "luma_disabled",
      status: "failed",
    };
  }

  const response = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LUMA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      loop: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[luma] Generation failed:", error);
    return { id: "error", status: "failed" };
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.state || "queued",
    videoUrl: data.assets?.video,
  };
}

export async function checkLumaStatus(generationId: string): Promise<LumaGenerationResult> {
  if (!LUMA_API_KEY) {
    return { id: generationId, status: "failed" };
  }

  const response = await fetch(
    `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
    {
      headers: {
        "Authorization": `Bearer ${LUMA_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    return { id: generationId, status: "failed" };
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.state || "unknown",
    videoUrl: data.assets?.video,
  };
}

// ---- Apply edit operations to the edit state ----

export function applyOperationsToState(
  currentState: any,
  operations: EditOperation[],
): any {
  const state = { ...currentState };

  for (const op of operations) {
    switch (op.type) {
      case "trim":
      case "cut": {
        if (!state.cuts) state.cuts = [];
        state.cuts.push({
          start: op.params.start,
          end: op.params.end,
          label: op.type === "trim" ? "trim" : "cut",
        });
        break;
      }
      case "speed_change": {
        if (!state.speedAdjustments) state.speedAdjustments = [];
        state.speedAdjustments.push({
          start: op.params.start,
          end: op.params.end,
          speed: op.params.speed,
        });
        break;
      }
      case "add_caption": {
        state.captions = true;
        if (op.params.style) state.captionStyle = op.params.style;
        if (op.params.position) state.captionPosition = op.params.position;
        break;
      }
      case "add_music": {
        state.musicStyle = op.params.style;
        break;
      }
      case "add_filter": {
        if (!state.filters) state.filters = [];
        state.filters.push({
          type: op.params.type,
          params: { value: op.params.value },
          startTime: op.params.start,
          endTime: op.params.end,
        });
        break;
      }
      case "add_transition": {
        if (!state.transitions) state.transitions = [];
        state.transitions.push({
          type: op.params.type,
          timestamp: op.params.timestamp,
          duration: op.params.duration,
        });
        break;
      }
      case "add_broll":
      case "luma_generate": {
        if (!state.brollSegments) state.brollSegments = [];
        state.brollSegments.push({
          timestamp: op.params.timestamp,
          duration: op.params.duration,
          query: op.params.prompt || op.params.query,
          lumaGenerationId: op.params.generationId,
          url: op.params.videoUrl,
        });
        break;
      }
    }
  }

  return state;
}
