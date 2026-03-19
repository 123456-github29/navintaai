import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";
import { utf8Safe } from "../utils/utf8Safe";
import { logApiCall } from "./apiLogger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Luma client is now in lumaClient.ts with full config/retry/validation support
export { generateLumaVideo, checkLumaStatus } from "./lumaClient";
export type { LumaGenerationResult } from "./lumaClient";

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
    response = await logApiCall({
      service: "openai-whisper",
      method: "POST",
      endpoint: "audio.transcriptions (whisper-1)",
      requestSummary: `file: ${path.basename(filePath)}`,
      fn: () =>
        openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
        }),
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

const EDIT_SYSTEM_PROMPT = `You are an expert video editor AI that produces polished, professional results comparable to Adobe Express or CapCut. Users describe edits in natural language and you translate them into precise editing operations. Be creative and proactive — if the user says "make it look professional", combine multiple operations (filters, captions, transitions). If they say something vague, pick the best interpretation and explain what you did.

IMPORTANT — POLISHED OUTPUT PHILOSOPHY:
- Every edit should look intentional and professional. No jump cuts, no dead air, no jarring gaps.
- When you cut dead space, ALWAYS add smooth transitions between the remaining segments (use set_segment_transitions).
- When combining multiple edits, think like a professional editor: cuts + transitions + color grade = polished output.
- Match transition style to content mood: corporate/serious → fade/dissolve, energetic/viral → slide/wipe, creative → flip/clock-wipe.

AVAILABLE OPERATIONS:

1. **cut** — Remove a time range from the video. Params: { start: number (seconds), end: number (seconds) }
   Use for: "remove the pause at 5 seconds", "cut deadspace", "trim the beginning", "remove ums and ahs", "cut the first 3 seconds", "remove silent parts"
   To cut deadspace/silence: analyze the transcript for pauses (gaps between segments) and generate a cut for each gap.
   IMPORTANT: After cutting, the video segments need smooth transitions. ALWAYS include a set_segment_transitions operation when you add cuts.

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

6. **add_transition** — Add a transition effect at a timestamp (legacy overlay). Params: { type: "fade"|"dissolve"|"wipe"|"zoom"|"flash"|"glitch", timestamp: number, duration: number (0.3-2.0) }
   Use for: "add a flash effect at 5s", "glitch effect"
   NOTE: For transitions BETWEEN cuts/segments, prefer set_segment_transitions instead — it produces much smoother results.

7. **set_segment_transitions** — Configure smooth transitions between video segments after cuts. This is what makes the edit look professional instead of patchy.
   Params: {
     mode: "auto"|"uniform"|"custom",
     type?: "fade"|"dissolve"|"slide-left"|"slide-right"|"slide-up"|"slide-down"|"wipe"|"wipe-up"|"wipe-diagonal"|"flip"|"clock-wipe"|"none",
     duration?: number (0.3-1.0 seconds, default 0.4),
     custom?: Array<{ afterSegmentIndex: number, type: string, duration?: number }>
   }
   Modes:
   - "auto" = intelligently vary transitions (fade at start/end, mix of wipe/slide/dissolve in between) — DEFAULT, best for most cases
   - "uniform" = use the same transition type everywhere (specify type param)
   - "custom" = specify exact transitions for each segment gap

   Transition types available:
   - "fade" / "dissolve" — smooth opacity crossfade (elegant, professional)
   - "slide-left" / "slide-right" / "slide-up" / "slide-down" — directional slide (energetic, modern)
   - "wipe" / "wipe-up" / "wipe-diagonal" — reveal wipe (dynamic, broadcast-style)
   - "flip" — 3D page flip (creative, eye-catching)
   - "clock-wipe" — circular clock sweep (cinematic, unique)
   - "none" — hard cut (use sparingly for intentional jump-cut effects)

   Style guide for choosing transitions:
   - Professional/corporate → fade, dissolve
   - Energetic/viral/TikTok → slide-left, slide-right, wipe
   - Cinematic/film → fade, wipe-diagonal, clock-wipe
   - Creative/fun → flip, slide-up, clock-wipe
   - Tutorial/educational → wipe, slide-left

8. **add_broll** — Insert AI-generated B-roll footage via Luma AI. Params: { query: string, timestamp: number, duration: number (2-10) }
   Use for: "add b-roll", "add stock footage", "insert relevant clips", "add visuals"
   The query will be used as a Luma AI generation prompt, so make it descriptive and cinematic (e.g., "a monkey swinging through jungle vines, cinematic lighting" not just "monkey")

9. **luma_generate** — Generate a cinematic AI clip. Params: { prompt: string, duration: number (3-10), timestamp: number, aspect_ratio?: "16:9"|"9:16"|"1:1" }
   Use for: "generate an intro", "AI clip", "create a cinematic shot"

9. **add_vfx** — Add visual effects / VFX assets as overlays. Params: { type: string, color?: string (hex), secondaryColor?: string (hex), intensity?: number (0-1, default 0.5), timestamp?: number (seconds, default 0), duration?: number (seconds, default full video), speed?: number (animation speed multiplier, default 1) }
   Available VFX types:
   - "light_leak" = warm drifting light wash (great for cinematic/dreamy looks). Default color: #ff9f43
   - "bokeh" = soft floating circles of light (great for romantic/aesthetic). Default color: #ffffff
   - "color_wash" = animated gradient color overlay. Params: color + secondaryColor. Default: #6c5ce7 + #00cec9
   - "particles" = floating sparkle specs (great for magical/fantasy). Default color: #ffffff
   - "lens_flare" = bright directional light streak (great for dramatic/epic). Default color: #fff5e6
   - "chromatic_aberration" = RGB channel split glitch effect (great for edgy/cyberpunk looks)
   - "smoke" = drifting fog/haze overlay (great for moody/mysterious). Default color: #aaaaaa
   - "prism" = rainbow light refraction band (great for creative/artistic)
   - "duotone" = two-color tinting overlay. Params: color + secondaryColor. Default: #6c5ce7 + #fdcb6e
   - "glow_pulse" = rhythmic radial glow (great for music/energy). Default color: #e84393
   Use for: "add some sparkles", "make the background fancy", "add light leaks", "add bokeh", "make it dreamy", "add VFX", "color overlay", "add fog", "make it glow", "add particles", "cyberpunk look", "rainbow effect"
   Map user intent: "dreamy/romantic" → light_leak + bokeh, "epic/dramatic" → lens_flare, "magical" → particles, "edgy/cyberpunk" → chromatic_aberration + glow_pulse, "moody" → smoke, "colorful/fancy" → color_wash or prism, "aesthetic" → bokeh + light_leak

RESPONSE FORMAT — always return valid JSON (no markdown):
{
  "message": "Brief, friendly explanation of what you're doing",
  "operations": [{ "type": "...", "params": { ... } }]
}

RULES:
- ALWAYS generate at least one operation when the user requests an edit. Never return an empty operations array for an edit request.
- Use the transcript to make intelligent timing decisions. Place cuts/transitions at natural speech boundaries.
- For "cut deadspace" or "remove silence": find gaps in the transcript segments (where end of one segment and start of next have a gap > 0.5s) and create a cut operation for each gap. ALWAYS follow up cuts with a set_segment_transitions operation (mode: "auto") to ensure smooth playback.
- For "make it viral/professional/cinematic": combine multiple operations (cut deadspace + set_segment_transitions + add_caption + add_filter). This creates a polished, broadcast-quality result.
- For "add transitions" or "smooth transitions": use set_segment_transitions with mode "auto" or pick a specific type.
- You can apply multiple operations in a single response.
- If the user asks something unrelated to video editing, still respond with a helpful message but with an empty operations array.
- Timestamps must be within 0 and the video duration. Round to 1 decimal place.
- THINK LIKE A PRO EDITOR: every cut needs a transition, every video needs color grading, captions should be styled to match the mood.`;

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

  const chatResponse = await logApiCall({
    service: "openai",
    method: "POST",
    endpoint: "chat.completions (gpt-4o, edit-planning)",
    requestSummary: `user request: ${userMessage.slice(0, 100)}`,
    fn: () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
  });

  const content = chatResponse.choices[0]?.message?.content || "{}";
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

// Luma AI functions moved to lumaClient.ts

// ---- Edit Presets ----
// Pre-configured edit packages that apply multiple operations at once.
// Inspired by AE-ScriptFlow's automated edit preparation workflow.

export interface EditPreset {
  id: string;
  name: string;
  description: string;
  category: "social" | "cinematic" | "professional" | "minimal";
  /** Operations that use transcript timing (cuts) are generated dynamically */
  getOperations: (videoDuration: number, transcriptSegments?: TranscriptSegment[]) => EditOperation[];
}

/** Find silence gaps in transcript segments to generate cut operations */
function findSilenceGaps(segments: TranscriptSegment[], videoDuration: number, minGap = 0.5): Array<{ start: number; end: number }> {
  const gaps: Array<{ start: number; end: number }> = [];
  if (!segments || segments.length === 0) return gaps;
  for (let i = 0; i < segments.length - 1; i++) {
    const gapStart = segments[i].end;
    const gapEnd = segments[i + 1].start;
    if (gapEnd - gapStart >= minGap) {
      gaps.push({ start: Math.round(gapStart * 10) / 10, end: Math.round(gapEnd * 10) / 10 });
    }
  }
  return gaps;
}

export const EDIT_PRESETS: EditPreset[] = [
  {
    id: "viral-ready",
    name: "Viral Ready",
    description: "Trim silence, viral captions, upbeat music, zoom transitions — optimized for TikTok & Reels",
    category: "social",
    getOperations: (videoDuration, segments) => {
      const ops: EditOperation[] = [];
      // Trim silence
      const gaps = findSilenceGaps(segments || [], videoDuration);
      for (const gap of gaps) {
        ops.push({ type: "cut", params: { start: gap.start, end: gap.end }, status: "pending" });
      }
      // Viral captions
      ops.push({ type: "add_caption", params: { style: "viral", position: "bottom" }, status: "pending" });
      // Upbeat music
      ops.push({ type: "add_music", params: { style: "Upbeat & Energetic", volume: 0.3 }, status: "pending" });
      // Contrast boost
      ops.push({ type: "add_filter", params: { type: "contrast", value: 1.2 }, status: "pending" });
      ops.push({ type: "add_filter", params: { type: "saturation", value: 1.15 }, status: "pending" });
      // Zoom transitions at ~1/3 and ~2/3 of video
      const t1 = Math.round(videoDuration * 0.33 * 10) / 10;
      const t2 = Math.round(videoDuration * 0.66 * 10) / 10;
      ops.push({ type: "add_transition", params: { type: "zoom", timestamp: t1, duration: 0.5 }, status: "pending" });
      ops.push({ type: "add_transition", params: { type: "zoom", timestamp: t2, duration: 0.5 }, status: "pending" });
      return ops;
    },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Film-grade color grading, cinematic captions, smooth fades, atmospheric music",
    category: "cinematic",
    getOperations: (videoDuration) => [
      { type: "add_caption", params: { style: "cinematic", position: "bottom" }, status: "pending" },
      { type: "add_music", params: { style: "Inspirational", volume: 0.25 }, status: "pending" },
      { type: "add_filter", params: { type: "cinematic", value: 1.0 }, status: "pending" },
      { type: "add_filter", params: { type: "contrast", value: 1.15 }, status: "pending" },
      { type: "add_filter", params: { type: "warm", value: 0.3 }, status: "pending" },
      { type: "add_transition", params: { type: "fade", timestamp: 0, duration: 1.0 }, status: "pending" },
      { type: "add_transition", params: { type: "fade", timestamp: Math.round((videoDuration - 1) * 10) / 10, duration: 1.0 }, status: "pending" },
    ],
  },
  {
    id: "clean-professional",
    name: "Clean & Professional",
    description: "Polished look with clean captions, corporate music, and subtle brightness adjustment",
    category: "professional",
    getOperations: (videoDuration, segments) => {
      const ops: EditOperation[] = [];
      // Trim silence for tighter pacing
      const gaps = findSilenceGaps(segments || [], videoDuration, 0.8);
      for (const gap of gaps) {
        ops.push({ type: "cut", params: { start: gap.start, end: gap.end }, status: "pending" });
      }
      ops.push({ type: "add_caption", params: { style: "boxed", position: "bottom" }, status: "pending" });
      ops.push({ type: "add_music", params: { style: "Corporate & Professional", volume: 0.2 }, status: "pending" });
      ops.push({ type: "add_filter", params: { type: "brightness", value: 1.1 }, status: "pending" });
      ops.push({ type: "add_filter", params: { type: "sharpen", value: 0.3 }, status: "pending" });
      ops.push({ type: "add_transition", params: { type: "dissolve", timestamp: 0, duration: 0.8 }, status: "pending" });
      return ops;
    },
  },
  {
    id: "high-energy",
    name: "High Energy",
    description: "Fast-paced with speed ramps, neon captions, glitch transitions, and boosted colors",
    category: "social",
    getOperations: (videoDuration, segments) => {
      const ops: EditOperation[] = [];
      // Trim silence aggressively
      const gaps = findSilenceGaps(segments || [], videoDuration, 0.3);
      for (const gap of gaps) {
        ops.push({ type: "cut", params: { start: gap.start, end: gap.end }, status: "pending" });
      }
      // Speed ramp in middle section
      const midStart = Math.round(videoDuration * 0.4 * 10) / 10;
      const midEnd = Math.round(videoDuration * 0.6 * 10) / 10;
      ops.push({ type: "speed_change", params: { start: midStart, end: midEnd, speed: 1.5 }, status: "pending" });
      // Neon captions
      ops.push({ type: "add_caption", params: { style: "neon", position: "bottom" }, status: "pending" });
      // Energetic music
      ops.push({ type: "add_music", params: { style: "Upbeat & Energetic", volume: 0.35 }, status: "pending" });
      // Color boost
      ops.push({ type: "add_filter", params: { type: "saturation", value: 1.3 }, status: "pending" });
      ops.push({ type: "add_filter", params: { type: "contrast", value: 1.25 }, status: "pending" });
      // Glitch transitions
      const t1 = Math.round(videoDuration * 0.25 * 10) / 10;
      const t2 = Math.round(videoDuration * 0.5 * 10) / 10;
      const t3 = Math.round(videoDuration * 0.75 * 10) / 10;
      ops.push({ type: "add_transition", params: { type: "glitch", timestamp: t1, duration: 0.4 }, status: "pending" });
      ops.push({ type: "add_transition", params: { type: "flash", timestamp: t2, duration: 0.3 }, status: "pending" });
      ops.push({ type: "add_transition", params: { type: "glitch", timestamp: t3, duration: 0.4 }, status: "pending" });
      return ops;
    },
  },
  {
    id: "storyteller",
    name: "Storyteller",
    description: "Warm tones, highlighted captions, gentle music, and smooth fades for narrative content",
    category: "cinematic",
    getOperations: (videoDuration) => [
      { type: "add_caption", params: { style: "highlighted", position: "bottom" }, status: "pending" },
      { type: "add_music", params: { style: "Calm & Relaxing", volume: 0.2 }, status: "pending" },
      { type: "add_filter", params: { type: "warm", value: 0.4 }, status: "pending" },
      { type: "add_filter", params: { type: "brightness", value: 1.05 }, status: "pending" },
      { type: "add_transition", params: { type: "fade", timestamp: 0, duration: 1.2 }, status: "pending" },
      { type: "add_transition", params: { type: "dissolve", timestamp: Math.round(videoDuration * 0.5 * 10) / 10, duration: 0.8 }, status: "pending" },
      { type: "add_transition", params: { type: "fade", timestamp: Math.round((videoDuration - 1.2) * 10) / 10, duration: 1.2 }, status: "pending" },
    ],
  },
  {
    id: "quick-cleanup",
    name: "Quick Cleanup",
    description: "Just the basics — trim dead air and add clean auto-captions",
    category: "minimal",
    getOperations: (videoDuration, segments) => {
      const ops: EditOperation[] = [];
      const gaps = findSilenceGaps(segments || [], videoDuration);
      for (const gap of gaps) {
        ops.push({ type: "cut", params: { start: gap.start, end: gap.end }, status: "pending" });
      }
      ops.push({ type: "add_caption", params: { style: "default", position: "bottom" }, status: "pending" });
      return ops;
    },
  },
];

export function getPresetById(presetId: string): EditPreset | undefined {
  return EDIT_PRESETS.find(p => p.id === presetId);
}

// ---- Apply edit operations to the edit state ----

// Available Remotion transition types for segment transitions
const SEGMENT_TRANSITION_TYPES = [
  "fade", "dissolve", "slide-left", "slide-right", "slide-up", "slide-down",
  "wipe", "wipe-up", "wipe-diagonal", "flip", "clock-wipe", "none",
] as const;

function isValidSegmentTransition(type: string): boolean {
  return (SEGMENT_TRANSITION_TYPES as readonly string[]).includes(type);
}

// Auto-generate varied transitions for a polished feel
function generateAutoTransitions(numSegments: number, fps: number = 30): any[] {
  const transitions: any[] = [];
  const pool = ["fade", "wipe", "slide-left", "dissolve", "wipe-up", "slide-right"];

  for (let i = 0; i < numSegments - 1; i++) {
    // First and last transitions are always fade (gentle bookend)
    let type: string;
    if (i === 0 || i === numSegments - 2) {
      type = "fade";
    } else {
      type = pool[i % pool.length];
    }

    transitions.push({
      afterSegmentIndex: i,
      type,
      durationInFrames: Math.round(0.4 * fps), // 0.4s — snappy and professional
      timing: "spring",
    });
  }

  return transitions;
}

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
      case "set_segment_transitions": {
        const mode = op.params.mode || "auto";
        const durationSec = op.params.duration || 0.4;
        const fps = 30;
        const durationInFrames = Math.round(durationSec * fps);

        if (mode === "auto") {
          // Calculate how many kept segments exist based on current cuts
          // We'll estimate from the number of cuts — each cut creates a gap, producing N+1 segments from N cuts
          const numCuts = (state.cuts || []).length;
          const numSegments = numCuts > 0 ? numCuts + 1 : 2; // minimum 2 segments for a transition
          state.segmentTransitions = generateAutoTransitions(numSegments, fps);
          state.autoTransitions = true;
        } else if (mode === "uniform") {
          const transType = isValidSegmentTransition(op.params.type || "fade")
            ? op.params.type
            : "fade";
          // Generate uniform transitions for all segment gaps
          const numCuts = (state.cuts || []).length;
          const numSegments = numCuts > 0 ? numCuts + 1 : 2;
          const transitions: any[] = [];
          for (let i = 0; i < numSegments - 1; i++) {
            transitions.push({
              afterSegmentIndex: i,
              type: transType,
              durationInFrames,
              timing: "spring",
            });
          }
          state.segmentTransitions = transitions;
          state.autoTransitions = false;
        } else if (mode === "custom" && Array.isArray(op.params.custom)) {
          state.segmentTransitions = op.params.custom.map((c: any) => ({
            afterSegmentIndex: c.afterSegmentIndex,
            type: isValidSegmentTransition(c.type) ? c.type : "fade",
            durationInFrames: c.duration ? Math.round(c.duration * fps) : durationInFrames,
            timing: "spring",
          }));
          state.autoTransitions = false;
        }
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
      case "add_vfx": {
        if (!state.vfxAssets) state.vfxAssets = [];
        state.vfxAssets.push({
          type: op.params.type,
          color: op.params.color,
          secondaryColor: op.params.secondaryColor,
          intensity: op.params.intensity,
          timestamp: op.params.timestamp,
          duration: op.params.duration,
          speed: op.params.speed,
        });
        break;
      }
    }
  }

  return state;
}
