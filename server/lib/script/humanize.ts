const REMOVAL_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bIn today's video,?\s*/gi, replacement: "" },
  { pattern: /\bLet's dive in\.?\s*/gi, replacement: "" },
  { pattern: /\bLet's get started\.?\s*/gi, replacement: "" },
  { pattern: /\bWithout further ado,?\s*/gi, replacement: "" },
  { pattern: /\bIn this video,?\s*/gi, replacement: "" },
  { pattern: /\bWelcome back to my channel\.?\s*/gi, replacement: "" },
  { pattern: /\bHey guys,?\s*/gi, replacement: "" },
  { pattern: /\bWhat's up everyone,?\s*/gi, replacement: "" },
  { pattern: /\bMake sure to like and subscribe\.?\s*/gi, replacement: "" },
  { pattern: /\bSmash that like button\.?\s*/gi, replacement: "" },
  { pattern: /\bDon't forget to subscribe\.?\s*/gi, replacement: "" },
  { pattern: /\bAs always,?\s*/gi, replacement: "" },
  { pattern: /\bBuckle up,?\s*/gi, replacement: "" },
  { pattern: /\bStay tuned\.?\s*/gi, replacement: "" },
  { pattern: /\bThat being said,?\s*/gi, replacement: "" },
  { pattern: /\bHaving said that,?\s*/gi, replacement: "" },
  { pattern: /\bIt goes without saying,?\s*/gi, replacement: "" },
  { pattern: /\bAt the end of the day,?\s*/gi, replacement: "Look... " },
  { pattern: /\bNeedless to say,?\s*/gi, replacement: "" },
  { pattern: /\bIn conclusion,?\s*/gi, replacement: "So here's the thing... " },
  { pattern: /\bTo summarize,?\s*/gi, replacement: "" },
  { pattern: /\bIt's important to note that\s*/gi, replacement: "Here's the thing... " },
  { pattern: /\bIt's worth mentioning that\s*/gi, replacement: "" },
  { pattern: /\bIt should be noted that\s*/gi, replacement: "" },
  { pattern: /\bThe fact of the matter is\s*/gi, replacement: "Look... " },
  { pattern: /\bWhen it comes to\s*/gi, replacement: "With " },
  { pattern: /\bIn terms of\s*/gi, replacement: "For " },
  { pattern: /\bThe reality is\s*/gi, replacement: "Honestly... " },
  { pattern: /\bThe truth is that\s*/gi, replacement: "Honestly... " },
  { pattern: /\bWhat you need to understand is\s*/gi, replacement: "" },
];

const FORMALITY_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bdo not\b/gi, replacement: "don't" },
  { pattern: /\bcannot\b/gi, replacement: "can't" },
  { pattern: /\bwill not\b/gi, replacement: "won't" },
  { pattern: /\bshould not\b/gi, replacement: "shouldn't" },
  { pattern: /\bwould not\b/gi, replacement: "wouldn't" },
  { pattern: /\bcould not\b/gi, replacement: "couldn't" },
  { pattern: /\bis not\b/gi, replacement: "isn't" },
  { pattern: /\bare not\b/gi, replacement: "aren't" },
  { pattern: /\bI am\b/g, replacement: "I'm" },
  { pattern: /\byou are\b/gi, replacement: "you're" },
  { pattern: /\bthey are\b/gi, replacement: "they're" },
  { pattern: /\bwe are\b/gi, replacement: "we're" },
  { pattern: /\bit is\b/gi, replacement: "it's" },
  { pattern: /\bthat is\b/gi, replacement: "that's" },
  { pattern: /\bhere is\b/gi, replacement: "here's" },
  { pattern: /\bthere is\b/gi, replacement: "there's" },
  { pattern: /\bI have\b/g, replacement: "I've" },
  { pattern: /\byou have\b/gi, replacement: "you've" },
  { pattern: /\bI will\b/g, replacement: "I'll" },
  { pattern: /\byou will\b/gi, replacement: "you'll" },
  { pattern: /\butilize\b/gi, replacement: "use" },
  { pattern: /\bleverage\b/gi, replacement: "use" },
  { pattern: /\bfacilitate\b/gi, replacement: "help" },
  { pattern: /\bimplement\b/gi, replacement: "do" },
  { pattern: /\boptimize\b/gi, replacement: "improve" },
  { pattern: /\bprioritize\b/gi, replacement: "focus on" },
  { pattern: /\bsynergy\b/gi, replacement: "working together" },
  { pattern: /\bscalable\b/gi, replacement: "that grows" },
  { pattern: /\binnovative\b/gi, replacement: "new" },
  { pattern: /\brobust\b/gi, replacement: "solid" },
  { pattern: /\bholistic\b/gi, replacement: "complete" },
  { pattern: /\btransformative\b/gi, replacement: "life-changing" },
  { pattern: /\bgame.?changer\b/gi, replacement: "a big deal" },
  { pattern: /\blevel up\b/gi, replacement: "get better at" },
  { pattern: /\bunlock your potential\b/gi, replacement: "do more" },
  { pattern: /\bcrush your goals\b/gi, replacement: "hit your goals" },
  { pattern: /\byou've got this\b/gi, replacement: "" },
];

function addMicroPauses(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.map((s, i) => {
    if (i > 0 && i % 3 === 0 && !s.includes("...")) {
      return "... " + s;
    }
    return s;
  }).join(" ");
}

function ensureShortSentences(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const result: string[] = [];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    if (words.length > 25) {
      const mid = Math.floor(words.length / 2);
      let splitAt = mid;
      for (let i = mid - 3; i <= mid + 3 && i < words.length; i++) {
        if (/and|but|so|because|then|or|yet/i.test(words[i])) {
          splitAt = i;
          break;
        }
      }
      result.push(words.slice(0, splitAt).join(" ") + ".");
      result.push(words.slice(splitAt).join(" "));
    } else {
      result.push(sentence);
    }
  }

  return result.join(" ");
}

function cleanDoubleSpaces(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .replace(/\s+$/, "")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+([.!?,])/g, "$1");
}

export function humanizeText(text: string): string {
  let result = text;

  for (const { pattern, replacement } of REMOVAL_PATTERNS) {
    result = result.replace(pattern, replacement);
  }

  for (const { pattern, replacement } of FORMALITY_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  result = ensureShortSentences(result);
  result = addMicroPauses(result);
  result = cleanDoubleSpaces(result);

  return result;
}

export function humanizeScript(beats: Array<{ text: string; [key: string]: any }>): Array<{ text: string; [key: string]: any }> {
  return beats.map(beat => ({
    ...beat,
    text: humanizeText(beat.text),
  }));
}
