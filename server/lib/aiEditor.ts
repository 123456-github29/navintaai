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

const EDIT_SYSTEM_PROMPT = `You are an expert video editor AI assistant. You help users edit their videos through natural language instructions.

You have access to the following editing capabilities:
1. **trim** - Cut portions of the video. Params: { start: number (seconds), end: number (seconds) }
2. **cut** - Remove a section from the video. Params: { start: number (seconds), end: number (seconds) }
3. **speed_change** - Change playback speed of a segment. Params: { start: number, end: number, speed: number (0.25-4.0) }
4. **add_caption** - Add captions/subtitles to the video. Params: { style?: "viral"|"boxed"|"cinematic"|"neon"|"gradient"|"highlighted"|"outline"|"default", position?: "bottom"|"top"|"center" }
   - "viral" = CapCut-style word-by-word yellow highlight (default if user says "viral", "bold", "CapCut")
   - "boxed" = white text on dark box
   - "cinematic" = frosted glass box, cinematic look
   - "neon" = glowing cyan neon text
   - "gradient" = colorful gradient background pill
   - "highlighted" = word-by-word highlight, similar to viral
   - "outline" = large white text with black outline, no background
   - "default" = clean white text with subtle shadow
   Pick the style that best matches the user's request (e.g. "clean" → "default", "neon" → "neon", "cinematic" → "cinematic"). Default to "viral" if unspecified.
5. **add_music** - Add background music. Params: { style: string, volume: number (0-1) }
6. **add_filter** - Apply a visual filter. Params: { type: "brightness"|"contrast"|"saturation"|"blur"|"sharpen"|"vintage"|"cinematic"|"warm"|"cool", value: number, start?: number, end?: number }
7. **add_transition** - Add transition between segments. Params: { type: "fade"|"dissolve"|"wipe"|"zoom", timestamp: number, duration: number }
8. **add_broll** - Insert B-roll footage (will use AI generation). Params: { query: string, timestamp: number, duration: number (2-10 seconds) }
9. **luma_generate** - Generate a cinematic AI clip using Luma. Params: { prompt: string, duration: number (3-10 seconds), timestamp: number, aspect_ratio?: "16:9"|"9:16"|"1:1" }

When the user requests an edit, respond with a JSON object containing:
- "message": A friendly explanation of what you're doing
- "operations": An array of edit operations to apply

Consider the video transcript to make intelligent decisions about where to place edits.

IMPORTANT: Always respond with valid JSON. No markdown code blocks, just raw JSON.`;

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
