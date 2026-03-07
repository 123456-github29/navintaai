import type { ScriptStructure, ScriptScoreBreakdown } from "./types";

const AI_PHRASES = [
  "in today's video",
  "let's dive in",
  "let's get started",
  "without further ado",
  "in this video",
  "welcome back",
  "hey guys",
  "what's up everyone",
  "make sure to like and subscribe",
  "smash that like button",
  "don't forget to subscribe",
  "in this tutorial",
  "as always",
  "buckle up",
  "game changer",
  "level up",
  "unlock your potential",
  "crush your goals",
  "you've got this",
  "stay tuned",
  "that being said",
  "having said that",
  "it goes without saying",
  "at the end of the day",
  "needless to say",
  "in conclusion",
  "to summarize",
];

const FILLER_PHRASES = [
  "it's important to note",
  "it's worth mentioning",
  "it should be noted",
  "the fact of the matter is",
  "when it comes to",
  "in terms of",
  "the reality is",
  "the truth is that",
  "what you need to understand is",
];

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function hasProofElement(script: ScriptStructure): boolean {
  const fullText = script.beats.map(b => b.text).join(" ").toLowerCase();
  const proofPatterns = [
    /\d+%/,
    /\$\d+/,
    /\d+x/,
    /\d+ (days|weeks|months|hours|minutes)/,
    /increased|decreased|grew|saved|earned|made|lost/,
    /example|case study|client|customer|result/,
    /before.*after|went from.*to/i,
  ];
  return proofPatterns.some(p => p.test(fullText));
}

function hasPatternInterrupt(beats: ScriptStructure["beats"]): number {
  let interrupts = 0;
  for (const beat of beats) {
    const sentences = beat.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    for (const s of sentences) {
      const words = countWords(s);
      if (words <= 5) interrupts++;
    }
    if (beat.type === "pattern_interrupt") interrupts++;
  }
  return interrupts;
}

function getReadingLevel(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 12;

  const avgWordsPerSentence = words.length / sentences.length;
  const syllables = words.reduce((sum, w) => sum + estimateSyllables(w), 0);
  const avgSyllablesPerWord = syllables / words.length;

  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  return Math.max(1, Math.min(16, Math.round(gradeLevel)));
}

function estimateSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (word.endsWith("e") && count > 1) count--;
  if (word.endsWith("le") && word.length > 3) count++;
  return Math.max(1, count);
}

function countAIPhrases(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of [...AI_PHRASES, ...FILLER_PHRASES]) {
    if (lower.includes(phrase)) count++;
  }
  return count;
}

function hasContractions(text: string): boolean {
  return /\b(don't|can't|won't|isn't|aren't|couldn't|shouldn't|wouldn't|I'm|you're|they're|we're|it's|that's|here's|there's|what's|who's|how's|let's|I've|you've|we've|they've|I'll|you'll|he'll|she'll|we'll|they'll|I'd|you'd|he'd|she'd|we'd|they'd)\b/i.test(text);
}

export function scoreScript(script: ScriptStructure, targetDurationSec: number): ScriptScoreBreakdown {
  const fullText = script.beats.map(b => b.text).join(" ");
  const hookText = script.hook;
  const feedback: string[] = [];

  let hookStrength = 0;
  const hookWords = countWords(hookText);
  if (hookWords > 0 && hookWords <= 20) hookStrength += 8;
  else if (hookWords > 20) { hookStrength += 4; feedback.push("Hook is too long - keep it under 20 words"); }
  if (/\?/.test(hookText)) hookStrength += 4;
  if (/\d/.test(hookText)) hookStrength += 3;
  if (/never|nobody|stop|secret|mistake|wrong|actually|truth/i.test(hookText)) hookStrength += 3;
  if (/you |your /i.test(hookText)) hookStrength += 2;
  hookStrength = Math.min(20, hookStrength);
  if (hookStrength < 12) feedback.push("Hook needs stronger curiosity gap or claim");

  let clarity = 0;
  const readingLevel = getReadingLevel(fullText);
  if (readingLevel <= 8) clarity = 15;
  else if (readingLevel <= 10) clarity = 10;
  else if (readingLevel <= 12) { clarity = 6; feedback.push("Simplify language to 8th-grade reading level"); }
  else { clarity = 3; feedback.push("Script is too complex - use simpler words and shorter sentences"); }

  let patternInterruptScore = 0;
  const interruptCount = hasPatternInterrupt(script.beats);
  const totalBeats = script.beats.length;
  if (interruptCount >= 3) patternInterruptScore = 15;
  else if (interruptCount >= 2) patternInterruptScore = 10;
  else if (interruptCount >= 1) patternInterruptScore = 6;
  else { patternInterruptScore = 2; feedback.push("Add short punchy sentences as pattern interrupts"); }

  let payoffScore = 0;
  const hasPayoff = script.payoff && countWords(script.payoff) > 5;
  const payoffBeat = script.beats.find(b => b.type === "payoff");
  if (hasPayoff && payoffBeat) payoffScore = 15;
  else if (hasPayoff || payoffBeat) { payoffScore = 8; feedback.push("Payoff exists but could be clearer"); }
  else { payoffScore = 2; feedback.push("Add a clear payoff - tell viewer why they should care"); }

  let specificityScore = 0;
  if (hasProofElement(script)) specificityScore += 8;
  else feedback.push("Add at least one specific number, result, or example");
  const hasNumbers = /\d/.test(fullText);
  if (hasNumbers) specificityScore += 4;
  const hasConcreteExample = /for example|like when|imagine|picture this|here's what happened/i.test(fullText);
  if (hasConcreteExample) specificityScore += 3;
  specificityScore = Math.min(15, specificityScore);

  let humanTone = 0;
  const aiCount = countAIPhrases(fullText);
  if (aiCount === 0) humanTone += 4;
  else if (aiCount <= 1) { humanTone += 2; feedback.push("Remove AI-sounding phrases"); }
  else { humanTone += 0; feedback.push("Script sounds too AI-generated - remove generic phrases"); }
  if (hasContractions(fullText)) humanTone += 3;
  else feedback.push("Use contractions (don't, can't, it's) to sound natural");
  if (/\.{3}|--|-\s/.test(fullText)) humanTone += 2;
  if (/\b(honestly|look|listen|okay|right)\b/i.test(fullText)) humanTone += 1;
  humanTone = Math.min(10, humanTone);

  let ctaScore = 0;
  const ctaText = script.cta;
  if (ctaText && countWords(ctaText) > 2) {
    ctaScore += 5;
    const isSpammy = /subscribe|like|follow|share|comment/i.test(ctaText);
    if (!isSpammy) ctaScore += 5;
    else { ctaScore += 2; feedback.push("CTA is too pushy - make it relevant to content"); }
  } else {
    ctaScore = 3;
    feedback.push("Add a natural call-to-action");
  }
  ctaScore = Math.min(10, ctaScore);

  const total = hookStrength + clarity + patternInterruptScore + payoffScore + specificityScore + humanTone + ctaScore;

  return {
    hookStrength,
    claritySimpplicity: clarity,
    patternInterrupts: patternInterruptScore,
    payoffClarity: payoffScore,
    specificity: specificityScore,
    humanTone,
    ctaRelevance: ctaScore,
    total,
    feedback,
  };
}
