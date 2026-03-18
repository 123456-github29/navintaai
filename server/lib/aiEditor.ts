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

3. **add_caption** — Add auto-generated captions from the transcript. Params: { style?: string, position?: "bottom"|"top"|"center" }
   Available styles:
   - "viral" = CapCut-style word-by-word yellow highlight (DEFAULT — use when unspecified, or user says "CapCut", "TikTok style")
   - "boxed" = white text on dark box
   - "cinematic" = frosted glass with border
   - "neon" = glowing cyan neon text
   - "gradient" = colorful gradient pill background
   - "highlighted" = word-by-word highlight similar to viral
   - "outline" = big white text with black stroke, no background
   - "default" = clean white text with shadow
   - "bold" = extra large pink highlight, word-by-word
   - "typewriter" = green monospace text on dark background (hacker/code look)
   - "retro" = orange retro text with 3D shadow (80s style)
   - "minimal" = small, subtle, clean white text
   - "fire" = orange/red flame text with glow, word-by-word
   - "glitch" = RGB-split glitch effect (cyberpunk)
   - "karaoke" = progressive fill animation like karaoke
   - "shadow" = dramatic multi-layer drop shadow
   - "comic" = yellow text on red box with comic book border
   - "elegant" = serif font, subtle and refined
   - "broadcast" = news/TV broadcast bar style
   - "wave" = purple/cyan color-shifting word highlight
   - "stack" = large green highlight, word-by-word
   Map user intent: "clean"/"simple" → "minimal", "glow"/"neon" → "neon", "movie"/"film" → "cinematic", "colorful" → "gradient", "fire"/"flame" → "fire", "glitch"/"cyber" → "glitch", "karaoke"/"sing" → "karaoke", "news"/"tv" → "broadcast", "comic"/"cartoon" → "comic", "fancy"/"classy" → "elegant", "retro"/"80s"/"vintage" → "retro", "hacker"/"code"/"terminal" → "typewriter", "big"/"bold"/"impact" → "bold"

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

// ---- Direct JSON generation for Remotion ----

const REMOTION_JSON_PROMPT = `You are an expert video editor AI. Users describe videos in natural language and you convert their requests directly into a JSON object that can be rendered by Remotion.

IMPORTANT: You generate COMPLETE VideoEditorProps JSON, not operations. Return ONLY valid JSON with no markdown.

CAPTION STYLES (map user intent to these):
- "viral" = CapCut-style word-by-word yellow highlight (DEFAULT, use for "CapCut", "TikTok", "viral")
- "bold" = extra large pink highlight, word-by-word (use for "big", "bold", "impact")
- "cinematic" = frosted glass with border (use for "movie", "film", "cinema")
- "neon" = glowing cyan neon text (use for "glow", "glowing", "neon")
- "fire" = orange/red flame text with glow, word-by-word (use for "fire", "flame", "fiery")
- "glitch" = RGB-split glitch effect (use for "glitch", "cyber", "cyberpunk")
- "karaoke" = progressive fill animation (use for "karaoke", "sing")
- "outline" = big white text with black stroke
- "boxed" = white text on dark box
- "gradient" = colorful gradient pill (use for "colorful", "gradient", "rainbow")
- "typewriter" = green monospace (use for "hacker", "code", "terminal")
- "retro" = orange retro text with 3D shadow (use for "retro", "80s", "vintage")
- "minimal" = small, subtle, clean white (use for "clean", "simple", "minimal")
- "shadow" = dramatic multi-layer drop shadow
- "comic" = yellow text on red box (use for "comic", "cartoon")
- "elegant" = serif font, subtle (use for "fancy", "classy", "elegant")
- "broadcast" = news/TV bar style (use for "news", "tv", "broadcast")
- "wave" = purple/cyan color-shifting
- "stack" = large green highlight, word-by-word
- "highlighted" = word-by-word highlight
- "default" = clean white text with shadow

Available transition types: "fade", "dissolve", "wipe", "zoom", "flash", "glitch"

Available filter types: "brightness", "contrast", "saturation", "blur", "sharpen", "vintage", "cinematic", "warm", "cool"

Available gradeLook values: "none", "cinematic", "vintage", "warm", "cool", "dramatic", "matte", "neon", "teal_orange"

JSON STRUCTURE (VideoEditorProps):
{
  "videoSrc": "file path (don't modify)",
  "cuts": [{ "start": number, "end": number, "label": string? }],
  "captions": [{ "start": number, "end": number, "text": string, "style": string, "position": "top"|"bottom"|"center" }],
  "filters": [{ "type": string, "value": 0-2, "startTime": number?, "endTime": number? }],
  "transitions": [{ "type": string, "timestamp": number, "duration": 0.3-2.0 }],
  "brollSegments": [{ "timestamp": number, "duration": number, "url": string? }],
  "speedAdjustments": [{ "start": number, "end": number, "speed": 0.25-4.0 }],
  "totalDurationInSeconds": number,
  "gradeLook": string,
  "showFilmGrain": boolean,
  "showCinematicBars": boolean
}

Rules:
- ALWAYS preserve videoSrc, totalDurationInSeconds (don't change)
- Map user intent to available caption styles using the mappings above
- Use reasonable timing/duration values
- If user requests "captions" or mentions caption style, use transcriptSegments to populate captions array with full text
- For cuts, find natural speech boundaries from transcript
- Be creative - combine multiple elements for natural requests (e.g., "make it viral" = add captions in viral style + maybe add transitions)
- Return ONLY the JSON object, no explanation`;

export async function generateRemotionJSON(
  userMessage: string,
  transcript: string,
  transcriptSegments: Array<{ start: number; end: number; text: string }>,
  currentVideoSrc: string,
  totalDuration: number,
): Promise<{ json: any; message: string }> {
  const openai = new (await import("openai")).default({ apiKey: process.env.OPENAI_API_KEY });

  const context = `Video transcript: "${transcript}"
Transcript segments: ${JSON.stringify(transcriptSegments)}
Current video: ${currentVideoSrc}
Total duration: ${totalDuration}s

User request: ${userMessage}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: REMOTION_JSON_PROMPT },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || "{}";
  let parsedJSON: any = {};
  try {
    parsedJSON = JSON.parse(content);
  } catch {
    console.error("[remotion-json] Failed to parse response:", content);
  }

  // Generate a friendly message describing what was applied
  const changes: string[] = [];
  if (parsedJSON.captions?.length) changes.push(`${parsedJSON.captions.length} caption(s)`);
  if (parsedJSON.filters?.length) changes.push(`${parsedJSON.filters.length} filter(s)`);
  if (parsedJSON.transitions?.length) changes.push(`${parsedJSON.transitions.length} transition(s)`);
  if (parsedJSON.cuts?.length) changes.push(`${parsedJSON.cuts.length} cut(s)`);
  if (parsedJSON.speedAdjustments?.length) changes.push(`speed adjustment(s)`);
  if (parsedJSON.brollSegments?.length) changes.push(`${parsedJSON.brollSegments.length} B-roll segment(s)`);

  const message = changes.length > 0
    ? `✨ Updated your video: ${changes.join(", ")}`
    : `Got it! I'm processing your request.`;

  return { json: parsedJSON, message };
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
