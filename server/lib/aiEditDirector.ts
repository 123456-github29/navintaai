import { retryWithBackoff } from "./geminiRetry";
import { chatJSON } from "./openaiClient";
import type { CameraMove, TransitionType, ColorGradePreset, CameraMoveType } from "../../src/remotion/types/edl";

interface TranscriptWord {
  text: string;
  start: number;
  end: number;
}

interface DirectorInput {
  words: TranscriptWord[];
  existingCameraMoves: CameraMove[];
  videoDurationMs: number;
  clipCount: number;
  platform?: "tiktok" | "youtube_shorts" | "instagram_reels" | "general";
}

interface DirectorOutput {
  transitions: TransitionType[];
  captionStyleId: string;
  colorGrade: ColorGradePreset;
  musicVolume: number;
  additionalCameraMoves: CameraMove[];
}

const STYLE_CATEGORIES: Record<string, string[]> = {
  energetic: ["tiktok_classic_pop", "kinetic_bounce", "per_word_pill"],
  calm: ["subtitle_bar", "cinematic_plate"],
  dramatic: ["neon_glow", "marker_highlight"],
  professional: ["glass_pill", "subtitle_bar"],
  fun: ["per_word_pill", "kinetic_bounce", "tiktok_classic_pop"],
};

const DEFAULTS: DirectorOutput = {
  transitions: [],
  captionStyleId: "tiktok-classic-pop-clean-white",
  colorGrade: "none",
  musicVolume: 0.3,
  additionalCameraMoves: [],
};

function buildPrompt(input: DirectorInput): string {
  const wordTexts = input.words.map((w) => w.text).join(" ");
  const durationSec = Math.round(input.videoDurationMs / 1000);
  const speechDensity = input.words.length / Math.max(1, durationSec);

  return `You are a professional video editor AI. Analyze this transcript and make cinematic editing decisions.

TRANSCRIPT (${durationSec}s, ${input.words.length} words, ~${speechDensity.toFixed(1)} words/sec):
"${wordTexts.substring(0, 2000)}"

NUMBER OF CLIPS: ${input.clipCount}
EXISTING CAMERA MOVES: ${input.existingCameraMoves.length}
PLATFORM: ${input.platform || "general"}

Respond with ONLY valid JSON (no markdown, no explanation):

{
  "transitions": [array of ${input.clipCount - 1} transition types from: "fade", "slide", "wipe", "clockWipe", "flip"],
  "mood": "energetic" | "calm" | "dramatic" | "professional" | "fun",
  "colorGrade": "none" | "cinematic" | "vintage" | "moody" | "vibrant" | "pastel",
  "musicVolume": number between 0.1 and 0.5,
  "additionalMoves": [
    {
      "type": "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "dolly_in" | "dolly_out" | "rotate_cw" | "rotate_ccw" | "tracking",
      "startSec": number,
      "endSec": number,
      "reason": "string"
    }
  ]
}

RULES:
- Use "fade" for emotional moments and endings
- Use "slide" for continuation of a thought
- Use "wipe" for topic changes
- Use "clockWipe" sparingly for dramatic reveals
- Use "flip" very sparingly for high energy moments
- For colorGrade: "cinematic" for storytelling, "vintage" for nostalgia, "vibrant" for product/energy, "moody" for dark topics, "pastel" for soft/beauty
- musicVolume should be lower (0.15-0.25) when speech is dense, higher (0.3-0.5) for sparse speech
- Add 2-4 additional camera moves for establishing shots, reactions, emphasis that don't overlap with existing moves
- Each additional move should be 0.5-2 seconds long`;
}

function parseMoves(raw: any[]): CameraMove[] {
  const validTypes: CameraMoveType[] = [
    "zoom_in", "zoom_out", "pan_left", "pan_right",
    "pan_up", "pan_down", "tilt_up", "tilt_down",
    "rotate_cw", "rotate_ccw", "dolly_in", "dolly_out", "tracking",
  ];

  return raw
    .filter((m) => validTypes.includes(m.type) && typeof m.startSec === "number" && typeof m.endSec === "number")
    .map((m) => ({
      type: m.type as CameraMoveType,
      startSec: m.startSec,
      endSec: m.endSec,
      fromScale: m.type.includes("zoom") || m.type.includes("dolly") ? 1 : undefined,
      toScale: m.type === "zoom_in" || m.type === "dolly_in" ? 1.2 : m.type === "zoom_out" || m.type === "dolly_out" ? 1 : undefined,
      xOffset: m.type === "pan_left" ? -100 : m.type === "pan_right" ? 100 : m.type === "tracking" ? 120 : undefined,
      yOffset: m.type === "tilt_up" || m.type === "pan_up" ? -80 : m.type === "tilt_down" || m.type === "pan_down" ? 80 : undefined,
      rotation: m.type === "rotate_cw" ? 3 : m.type === "rotate_ccw" ? -3 : undefined,
    }));
}

function pickCaptionStyleId(mood: string): string {
  const families = STYLE_CATEGORIES[mood] || STYLE_CATEGORIES.energetic;
  const family = families[0];

  const familyToStyleId: Record<string, string> = {
    tiktok_classic_pop: "tiktok-classic-pop-clean-white",
    kinetic_bounce: "kinetic-bounce-pop-orange",
    per_word_pill: "per-word-pill-midnight",
    subtitle_bar: "subtitle-bar-classic-white",
    cinematic_plate: "cinematic-plate-gold",
    neon_glow: "neon-glow-cyan",
    marker_highlight: "marker-highlight-yellow",
    glass_pill: "glass-pill-frost",
    typewriter_cursor: "typewriter-cursor-green",
  };

  return familyToStyleId[family] || "tiktok-classic-pop-clean-white";
}

export async function runAiEditDirector(input: DirectorInput): Promise<DirectorOutput> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[aiEditDirector] No OPENAI_API_KEY, using defaults");
    return {
      ...DEFAULTS,
      transitions: Array(Math.max(0, input.clipCount - 1)).fill("fade"),
    };
  }

  try {
    const prompt = buildPrompt(input);
    const responseText = await retryWithBackoff(() => chatJSON({
      system: "You are an AI video edit director. Analyze the transcript and return edit decisions as JSON.",
      user: prompt,
    }));

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[aiEditDirector] No JSON in response");
      return { ...DEFAULTS, transitions: Array(Math.max(0, input.clipCount - 1)).fill("fade") };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const validTransitions: TransitionType[] = ["fade", "slide", "wipe", "clockWipe", "flip", "none"];
    const transitions: TransitionType[] = (parsed.transitions || [])
      .slice(0, input.clipCount - 1)
      .map((t: string) => validTransitions.includes(t as TransitionType) ? t as TransitionType : "fade");

    while (transitions.length < Math.max(0, input.clipCount - 1)) {
      transitions.push("fade");
    }

    const validGrades: ColorGradePreset[] = ["none", "cinematic", "vintage", "moody", "vibrant", "pastel"];
    const colorGrade = validGrades.includes(parsed.colorGrade) ? parsed.colorGrade : "none";

    const musicVolume = typeof parsed.musicVolume === "number"
      ? Math.max(0.05, Math.min(0.5, parsed.musicVolume))
      : 0.3;

    const additionalCameraMoves = parseMoves(parsed.additionalMoves || []);

    const mood = parsed.mood || "energetic";
    const captionStyleId = pickCaptionStyleId(mood);

    console.log(`[aiEditDirector] mood=${mood}, grade=${colorGrade}, vol=${musicVolume}, transitions=${transitions.length}, moves=${additionalCameraMoves.length}`);

    return {
      transitions,
      captionStyleId,
      colorGrade,
      musicVolume,
      additionalCameraMoves,
    };
  } catch (error: any) {
    console.error(`[aiEditDirector] Failed: ${error.message}`);
    return {
      ...DEFAULTS,
      transitions: Array(Math.max(0, input.clipCount - 1)).fill("fade"),
    };
  }
}
