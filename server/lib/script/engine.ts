import type { ScriptStructure, ScriptScoreBreakdown, HookStyle, ScriptBeat } from "./types";
import { getWordRangeForDuration, HOOK_STYLES } from "./types";
import { scoreScript } from "./scorer";
import { humanizeScript, humanizeText } from "./humanize";
import { retryWithBackoff } from "../geminiRetry";
import { chatJSON } from "../openaiClient";
import { deepSanitize } from "../../utils/sanitizeText";

interface ScriptEngineInput {
  brandName: string;
  brandDescription?: string;
  creatorType?: string;
  audienceDescription?: string;
  contentGoal?: string;
  brandPersonality?: string;
  cameraComfort?: string;
  emotionalResult?: string;
  platform?: string;
  hookStyle?: HookStyle;
  videoTitle: string;
  videoConcept: string;
  targetDurationSec: number;
}

interface ScriptEngineOutput {
  script: ScriptStructure;
  score: ScriptScoreBreakdown;
  flatScript: string;
  attempts: number;
}


function buildScriptPrompt(input: ScriptEngineInput): { system: string; user: string } {
  const wordRange = getWordRangeForDuration(input.targetDurationSec);
  const hookStyleInfo = input.hookStyle
    ? `Use this hook style: "${HOOK_STYLES[input.hookStyle].label}" - example pattern: "${HOOK_STYLES[input.hookStyle].example}"`
    : "Choose the best hook style for this content.";

  const system = `You are a viral script writer for short-form video (TikTok, Reels, Shorts).

Your scripts get millions of views because they:
- Open with a hook that stops the scroll in the first 1-2 seconds
- Use pattern interrupts every 3-5 seconds (short punchy lines, rhetorical questions, surprises)
- Include at least one proof element (number, result, example, mistake avoided)
- Include at least one relatable line (common frustration or "I've been there" moment)
- End with a clear payoff that makes the viewer glad they watched
- Sound like a real person talking, NOT an AI or marketing copy

Target viewer profile:
- Low attention span
- Skeptical
- Wants fast proof
- Needs simple language (8th grade reading level)

SCRIPT STRUCTURE RULES:
- Hook: first 1-2 seconds, must create curiosity or make a bold claim
- Body: 3-6 beats that build on each other
- Payoff: last 20-30% of runtime
- CTA: final 2-4 seconds, natural and relevant

NEVER USE:
- "In today's video..."
- "Let's dive in..."
- "Welcome back..."
- Generic motivational phrases
- Marketing buzzwords
- Over-formal language

ALWAYS USE:
- Contractions (don't, can't, it's)
- Short sentences mixed with longer ones
- "..." for micro-pauses
- Spoken rhythm and emphasis with *asterisks*`;

  const user = `Write a viral script for this video:

Title: "${input.videoTitle}"
Concept: "${input.videoConcept}"
Brand: ${input.brandName}${input.brandDescription ? ` - ${input.brandDescription}` : ""}
Target Audience: ${input.audienceDescription || "general"}
Tone: ${input.brandPersonality || "conversational"}
Platform: ${input.platform || "Instagram/TikTok"}
Duration: ${input.targetDurationSec} seconds
${hookStyleInfo}

Word count: MUST be ${wordRange.min}-${wordRange.max} words total across all beats.

Return ONLY valid JSON matching this exact structure:
{
  "title": "${input.videoTitle}",
  "hook": "The hook line (first 1-2 seconds, max 15 words)",
  "hookVariations": ["variation 1", "variation 2", "variation 3"],
  "beats": [
    {"type": "hook", "text": "Hook text matching the hook field", "onScreen": "text overlay if any", "brollHint": "", "durationSec": 2},
    {"type": "context", "text": "Why the viewer should care", "onScreen": "", "brollHint": "", "durationSec": 4},
    {"type": "insight", "text": "The main valuable point with *emphasis*", "onScreen": "", "brollHint": "", "durationSec": 6},
    {"type": "example", "text": "Concrete example or proof with numbers", "onScreen": "", "brollHint": "", "durationSec": 5},
    {"type": "pattern_interrupt", "text": "Short punchy line. Just a few words.", "onScreen": "", "brollHint": "", "durationSec": 2},
    {"type": "payoff", "text": "Why this matters - the viewer's reward for watching", "onScreen": "", "brollHint": "", "durationSec": 5},
    {"type": "cta", "text": "Natural call to action", "onScreen": "", "brollHint": "", "durationSec": 3}
  ],
  "payoff": "Summary of the key takeaway",
  "cta": "Natural call to action text",
  "captionLines": ["short caption line 1", "short caption line 2"],
  "suggestedShots": [
    {"shotId": "shot-1", "shotType": "talking-head", "whatToShow": "Creator speaking to camera", "why": "Direct connection for hook"}
  ],
  "pacing": {"avgSentenceWords": 8, "energyCurve": "high-medium-high"},
  "retentionToolsUsed": ["curiosity gap hook", "proof element", "pattern interrupt", "relatable frustration"]
}

CRITICAL: 
- Beat durations must sum to approximately ${input.targetDurationSec} seconds
- Total word count across all beats must be ${wordRange.min}-${wordRange.max}
- Include at least 1 "pattern_interrupt" beat type
- Include at least 1 proof element (number, result, or concrete example) in the beats
- Make the hook irresistible - it determines if anyone watches`;

  return { system, user };
}

function buildRegenerationPrompt(
  input: ScriptEngineInput,
  previousScript: ScriptStructure,
  score: ScriptScoreBreakdown
): { system: string; user: string } {
  const base = buildScriptPrompt(input);

  const feedbackSection = `
PREVIOUS SCRIPT SCORED ${score.total}/100 - NEEDS IMPROVEMENT.

Score breakdown:
- Hook strength: ${score.hookStrength}/20
- Clarity: ${score.claritySimpplicity}/15
- Pattern interrupts: ${score.patternInterrupts}/15
- Payoff clarity: ${score.payoffClarity}/15
- Specificity: ${score.specificity}/15
- Human tone: ${score.humanTone}/10
- CTA relevance: ${score.ctaRelevance}/10

Issues to fix:
${score.feedback.map(f => `- ${f}`).join("\n")}

Previous hook was: "${previousScript.hook}"
Rewrite the ENTIRE script addressing ALL feedback above. Make it significantly better.`;

  return {
    system: base.system,
    user: base.user + "\n\n" + feedbackSection,
  };
}

async function generateRawScript(system: string, user: string): Promise<ScriptStructure> {
  const text = await retryWithBackoff(() => chatJSON({
    system: system + "\n\nReturn ONLY valid JSON.",
    user,
  }));
  if (!text) throw new Error("No response from AI for script generation");

  const cleaned = text
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  const parsed = JSON.parse(cleaned);
  return deepSanitize(parsed) as ScriptStructure;
}

function flattenScript(script: ScriptStructure): string {
  return script.beats.map(b => b.text).join(" ");
}

function applyHumanizePass(script: ScriptStructure): ScriptStructure {
  const humanizedBeats = humanizeScript(script.beats);
  return {
    ...script,
    hook: humanizeText(script.hook),
    hookVariations: script.hookVariations.map(h => humanizeText(h)),
    beats: humanizedBeats as ScriptBeat[],
    payoff: humanizeText(script.payoff),
    cta: humanizeText(script.cta),
  };
}

export async function generateViralScript(input: ScriptEngineInput): Promise<ScriptEngineOutput> {
  const MAX_ATTEMPTS = 3;
  const MIN_SCORE = 75;

  let bestScript: ScriptStructure | null = null;
  let bestScore: ScriptScoreBreakdown | null = null;
  let attempts = 0;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    attempts++;
    try {
      let prompt;
      if (i === 0 || !bestScript || !bestScore) {
        prompt = buildScriptPrompt(input);
      } else {
        prompt = buildRegenerationPrompt(input, bestScript, bestScore);
      }

      console.log(`[ScriptEngine] Attempt ${attempts}/${MAX_ATTEMPTS} for "${input.videoTitle}"`);
      let script = await generateRawScript(prompt.system, prompt.user);
      script = applyHumanizePass(script);

      const score = scoreScript(script, input.targetDurationSec);
      console.log(`[ScriptEngine] Score: ${score.total}/100 (hook:${score.hookStrength} clarity:${score.claritySimpplicity} interrupt:${score.patternInterrupts} payoff:${score.payoffClarity} specific:${score.specificity} human:${score.humanTone} cta:${score.ctaRelevance})`);

      if (!bestScore || score.total > bestScore.total) {
        bestScript = script;
        bestScore = score;
      }

      if (score.total >= MIN_SCORE) {
        console.log(`[ScriptEngine] Script passed quality gate (${score.total} >= ${MIN_SCORE})`);
        break;
      }

      if (i < MAX_ATTEMPTS - 1) {
        console.log(`[ScriptEngine] Score ${score.total} < ${MIN_SCORE}, regenerating with feedback...`);
      }
    } catch (error: any) {
      console.error(`[ScriptEngine] Attempt ${attempts} failed:`, error.message);
      if (i === MAX_ATTEMPTS - 1 && !bestScript) {
        throw error;
      }
    }
  }

  if (!bestScript || !bestScore) {
    throw new Error("Failed to generate script after all attempts");
  }

  return {
    script: bestScript,
    score: bestScore,
    flatScript: flattenScript(bestScript),
    attempts,
  };
}

export function scriptToShotDialogue(script: ScriptStructure, targetDurationSec: number): Array<{
  id: string;
  shotNumber: number;
  instruction: string;
  cameraAngle: string;
  framing: string;
  dialogue: string;
  duration: number;
  completed: boolean;
}> {
  if (script.suggestedShots && script.suggestedShots.length > 0) {
    return script.suggestedShots.map((shot, i) => ({
      id: shot.shotId || `shot-${i + 1}`,
      shotNumber: i + 1,
      instruction: shot.whatToShow || shot.shotType,
      cameraAngle: "eye level",
      framing: shot.shotType === "talking-head" ? "medium-close" : "medium",
      dialogue: i === 0 ? flattenScript(script) : "",
      duration: i === 0 ? targetDurationSec : 0,
      completed: false,
    }));
  }

  return [{
    id: "shot-1",
    shotNumber: 1,
    instruction: "Look at camera, speak naturally and conversationally",
    cameraAngle: "eye level",
    framing: "medium-close",
    dialogue: flattenScript(script),
    duration: targetDurationSec,
    completed: false,
  }];
}

export function scriptToTeleprompterCards(script: ScriptStructure): Array<{
  beatIndex: number;
  beatType: string;
  text: string;
  stageDirection?: string;
  durationSec: number;
}> {
  const cards: Array<{
    beatIndex: number;
    beatType: string;
    text: string;
    stageDirection?: string;
    durationSec: number;
  }> = [];

  script.beats.forEach((beat, i) => {
    const words = beat.text.split(/\s+/);
    const MAX_WORDS_PER_CARD = 14;

    if (words.length <= MAX_WORDS_PER_CARD) {
      cards.push({
        beatIndex: i,
        beatType: beat.type,
        text: beat.text,
        stageDirection: beat.onScreen || undefined,
        durationSec: beat.durationSec,
      });
    } else {
      const chunks: string[] = [];
      for (let j = 0; j < words.length; j += MAX_WORDS_PER_CARD) {
        chunks.push(words.slice(j, j + MAX_WORDS_PER_CARD).join(" "));
      }
      const durationPerChunk = beat.durationSec / chunks.length;
      chunks.forEach((chunk, ci) => {
        cards.push({
          beatIndex: i,
          beatType: beat.type,
          text: chunk,
          stageDirection: ci === 0 ? beat.onScreen || undefined : undefined,
          durationSec: durationPerChunk,
        });
      });
    }
  });

  return cards;
}
