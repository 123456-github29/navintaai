import { randomUUID } from "crypto";

interface TranscriptWord {
  text: string;
  startFrame: number;
  endFrame: number;
}

interface BrollInsertPlan {
  insertId: string;
  startFrame: number;
  durationInFrames: number;
  prompt: string;
  aspectRatio: string;
}

interface BrollPlannerInput {
  words: TranscriptWord[];
  fps: number;
  totalDurationFrames: number;
  styleHint?: string;
  maxInserts?: number;
  aspectRatio?: string;
}

const ABSTRACT_KEYWORDS = [
  "imagine", "believe", "think", "feel", "concept", "idea", "theory",
  "million", "billion", "trillion", "percent", "increase", "decrease",
  "growth", "massive", "enormous", "incredible", "amazing", "insane",
  "revolution", "transform", "change", "future", "impact", "power",
  "success", "failure", "risk", "opportunity", "challenge", "journey",
  "dream", "vision", "goal", "strategy", "system", "process",
  "industry", "market", "economy", "technology", "innovation",
  "science", "research", "study", "data", "statistics", "evidence",
  "world", "global", "universe", "nature", "environment", "climate",
  "energy", "money", "wealth", "investment", "profit", "loss",
  "history", "ancient", "modern", "era", "century", "decade",
  "literally", "basically", "essentially", "fundamentally",
  "skyrocket", "explode", "surge", "boom", "crash", "collapse",
  "secret", "hidden", "unknown", "mysterious", "powerful",
  "actually", "seriously", "honestly", "truth", "reality",
  "problem", "solution", "answer", "question", "reason",
  "story", "example", "like", "such as", "instance",
];

const CLAIM_PATTERNS = [
  /\d+\s*(x|times|percent|%)/i,
  /\d{4}/,
  /every\s+(day|week|month|year)/i,
  /most\s+people/i,
  /studies?\s+show/i,
  /research\s+(shows?|proves?|found)/i,
  /according\s+to/i,
  /in\s+fact/i,
  /the\s+truth\s+is/i,
  /what\s+if/i,
];

const VISUAL_SUBJECTS: Record<string, string> = {
  money: "flowing currency and financial charts",
  wealth: "luxury lifestyle and golden aesthetics",
  technology: "futuristic technology and digital interfaces",
  innovation: "cutting-edge laboratory and invention workspace",
  nature: "breathtaking natural landscape with dramatic lighting",
  environment: "aerial view of lush forests and pristine waters",
  climate: "dramatic weather patterns and atmospheric phenomena",
  energy: "powerful energy waves and electric sparks",
  growth: "time-lapse of plants growing toward sunlight",
  success: "triumphant mountain summit at golden hour",
  failure: "crumbling structures in dramatic slow motion",
  future: "sleek futuristic cityscape at twilight",
  history: "ancient architecture bathed in warm light",
  world: "spinning globe with cinematic cloud formations",
  universe: "deep space nebula with swirling cosmic colors",
  science: "microscopic cellular structures in vivid detail",
  market: "bustling trading floor with dynamic energy",
  industry: "massive industrial machinery in motion",
  journey: "winding road through dramatic landscape",
  dream: "ethereal cloudscape with soft diffused light",
  power: "lightning striking across a stormy sky",
  data: "flowing streams of digital data visualization",
  system: "intricate mechanical gears working in harmony",
  process: "elegant assembly line in cinematic motion",
  strategy: "chess pieces on a board with dramatic lighting",
  risk: "tightrope walker silhouetted against sunset",
  opportunity: "open door flooding with golden light",
  challenge: "rock climber ascending a sheer cliff face",
  revolution: "sweeping aerial of a transforming cityscape",
  impact: "slow-motion water droplet creating ripples",
};

function frameToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

function scoreWord(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  let score = 0;

  if (ABSTRACT_KEYWORDS.some((kw) => lower.includes(kw.replace(/\s+/g, "")))) {
    score += 2;
  }

  const context = word.toLowerCase();
  for (const pattern of CLAIM_PATTERNS) {
    if (pattern.test(context)) {
      score += 3;
      break;
    }
  }

  if (/\d/.test(word)) {
    score += 1;
  }

  return score;
}

interface ScoredSegment {
  startFrame: number;
  endFrame: number;
  score: number;
  keywords: string[];
  wordCount: number;
}

function analyzeSegments(
  words: TranscriptWord[],
  fps: number,
  windowSeconds: number = 3
): ScoredSegment[] {
  if (words.length === 0) return [];

  const windowFrames = secondsToFrames(windowSeconds, fps);
  const segments: ScoredSegment[] = [];
  let i = 0;

  while (i < words.length) {
    const windowStart = words[i].startFrame;
    const windowEnd = windowStart + windowFrames;

    const windowWords: TranscriptWord[] = [];
    let j = i;
    while (j < words.length && words[j].startFrame < windowEnd) {
      windowWords.push(words[j]);
      j++;
    }

    if (windowWords.length > 0) {
      let totalScore = 0;
      const keywords: string[] = [];

      for (const w of windowWords) {
        const s = scoreWord(w.text);
        totalScore += s;
        if (s > 0) {
          keywords.push(w.text.toLowerCase().replace(/[^a-z0-9]/g, ""));
        }
      }

      segments.push({
        startFrame: windowWords[0].startFrame,
        endFrame: windowWords[windowWords.length - 1].endFrame,
        score: totalScore,
        keywords: Array.from(new Set(keywords)),
        wordCount: windowWords.length,
      });
    }

    i = Math.max(i + 1, j > i ? Math.floor((i + j) / 2) : i + 1);
  }

  return segments;
}

function extractContextKeywords(
  words: TranscriptWord[],
  centerFrame: number,
  fps: number,
  windowSeconds: number = 2
): string[] {
  const windowFrames = secondsToFrames(windowSeconds, fps);
  const startFrame = centerFrame - windowFrames;
  const endFrame = centerFrame + windowFrames;

  const contextWords = words.filter(
    (w) => w.startFrame >= startFrame && w.endFrame <= endFrame
  );

  const keywords: string[] = [];
  for (const w of contextWords) {
    const clean = w.text.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.length > 3 && scoreWord(w.text) > 0) {
      keywords.push(clean);
    }
  }

  return Array.from(new Set(keywords));
}

function buildVisualPrompt(keywords: string[], styleHint?: string): string {
  let subject = "abstract visual concept";
  let environment = "clean minimalist setting";
  let lighting = "soft cinematic lighting";
  let cameraMovement = "slow dolly movement";
  let mood = "professional and polished";

  for (const kw of keywords) {
    if (VISUAL_SUBJECTS[kw]) {
      subject = VISUAL_SUBJECTS[kw];
      break;
    }
  }

  if (keywords.some((k) => ["nature", "environment", "world", "climate"].includes(k))) {
    environment = "vast outdoor landscape";
    lighting = "golden hour natural light";
    cameraMovement = "sweeping aerial pan";
    mood = "awe-inspiring and grand";
  } else if (keywords.some((k) => ["technology", "data", "system", "innovation"].includes(k))) {
    environment = "sleek modern workspace";
    lighting = "cool blue ambient glow";
    cameraMovement = "smooth tracking shot";
    mood = "futuristic and precise";
  } else if (keywords.some((k) => ["money", "wealth", "market", "investment", "profit"].includes(k))) {
    environment = "upscale financial district";
    lighting = "warm golden accents";
    cameraMovement = "steady establishing shot";
    mood = "prestigious and aspirational";
  } else if (keywords.some((k) => ["dream", "imagine", "vision", "future"].includes(k))) {
    environment = "ethereal dreamlike space";
    lighting = "soft diffused backlight";
    cameraMovement = "gentle floating motion";
    mood = "inspiring and transcendent";
  } else if (keywords.some((k) => ["power", "energy", "explosion", "impact"].includes(k))) {
    environment = "dramatic open environment";
    lighting = "high contrast dramatic lighting";
    cameraMovement = "dynamic push-in";
    mood = "intense and powerful";
  }

  if (styleHint) {
    mood = `${styleHint}, ${mood}`;
  }

  return `Cinematic b-roll of ${subject}, ${environment}, ${lighting}, ${cameraMovement}, ${mood}. Ultra clean, high detail, realistic, no text, no logos.`;
}

export function planBrollInserts(input: BrollPlannerInput): BrollInsertPlan[] {
  const {
    words,
    fps,
    totalDurationFrames,
    styleHint,
    maxInserts = 5,
    aspectRatio = "9:16",
  } = input;

  if (words.length === 0) return [];

  const hookFrames = secondsToFrames(1.5, fps);
  const minGapFrames = secondsToFrames(3, fps);
  const maxInsertsPerWindow = 2;
  const windowFrames = secondsToFrames(30, fps);
  const insertDurationFrames = secondsToFrames(3, fps);

  const segments = analyzeSegments(words, fps);

  const candidates = segments
    .filter((seg) => seg.score >= 2)
    .filter((seg) => seg.startFrame >= hookFrames)
    .filter((seg) => seg.wordCount >= 3)
    .sort((a, b) => b.score - a.score);

  const inserts: BrollInsertPlan[] = [];
  const usedWindows = new Map<number, number>();

  for (const candidate of candidates) {
    if (inserts.length >= maxInserts) break;

    const windowIndex = Math.floor(candidate.startFrame / windowFrames);
    const windowCount = usedWindows.get(windowIndex) || 0;
    if (windowCount >= maxInsertsPerWindow) continue;

    const tooClose = inserts.some(
      (existing) =>
        Math.abs(candidate.startFrame - existing.startFrame) < minGapFrames
    );
    if (tooClose) continue;

    const startFrame = candidate.startFrame;
    const remainingFrames = totalDurationFrames - startFrame;
    const duration = Math.min(insertDurationFrames, remainingFrames);

    if (duration < secondsToFrames(1, fps)) continue;

    const contextKeywords = extractContextKeywords(
      words,
      startFrame,
      fps,
      2
    );

    const allKeywords = Array.from(new Set([...candidate.keywords, ...contextKeywords]));
    const prompt = buildVisualPrompt(allKeywords, styleHint);

    inserts.push({
      insertId: `luma-${Date.now()}-${randomUUID().slice(0, 8)}`,
      startFrame,
      durationInFrames: duration,
      prompt,
      aspectRatio,
    });

    usedWindows.set(windowIndex, windowCount + 1);
  }

  return inserts.sort((a, b) => a.startFrame - b.startFrame);
}
