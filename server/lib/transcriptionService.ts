import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import fetch from "node-fetch";
import FormData from "form-data";
import { utf8Safe } from "../utils/utf8Safe";

const execAsync = promisify(exec);

// Initialize OpenAI client with node-fetch to avoid undici ByteString encoding issues
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "placeholder") {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
}

// Direct Whisper API call using node-fetch to avoid undici ByteString issues
async function whisperTranscribe(audioFilePath: string): Promise<any> {
  const rawApiKey = process.env.OPENAI_API_KEY;
  if (!rawApiKey || rawApiKey === "placeholder") {
    throw new Error("OPENAI_API_KEY not configured");
  }
  
  // Sanitize API key - remove any whitespace, newlines, or non-ASCII characters
  const apiKey = rawApiKey.trim().replace(/[\r\n\s]/g, '');

  const audioBuffer = await fs.readFile(audioFilePath);
  const form = new FormData();
  form.append("file", audioBuffer, {
    filename: "audio.wav",
    contentType: "audio/wav",
  });
  form.append("model", "gpt-4o-transcribe");
  form.append("response_format", "verbose_json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// High-impact word lists for highlighting
const HIGHLIGHT_WORDS = {
  emotion: ["crazy", "insane", "wild", "unreal", "amazing", "incredible", "shocking", "unbelievable", "mind-blowing", "epic"],
  money: ["broke", "million", "profit", "rich", "cash", "dollars", "free", "save", "earn", "expensive", "cheap"],
  urgency: ["now", "today", "instantly", "fast", "quick", "hurry", "limited", "urgent", "immediate", "asap"]
};

const CAPTION_STYLE = {
  font: "Montserrat 900 uppercase",
  baseTextColor: "white",
  outlineColor: "black",
  background: "none",
  highlightTextColor: "#FACC15",
  highlightBackground: "#FACC15",
  position: "bottom_center",
  animation: "pop",
  highlightMode: "scale+color",
  highlightScale: 1.2,
};

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  words?: WordTimestamp[];
}

interface Caption {
  start: number;
  end: number;
  originalText: string;
  viralText: string;
  useViral: boolean;
  highlightWords: string[];
  words: WordTimestamp[]; // Word-level timing for animated captions
  style: typeof CAPTION_STYLE;
}

interface TranscriptionResult {
  language: string;
  duration: number;
  captions: Caption[];
}

/**
 * Step 1: Extract audio from video file
 * Normalizes to mono, 16kHz for optimal transcription
 */
export async function extractAudio(videoFilePath: string): Promise<string> {
  const audioPath = videoFilePath.replace(/\.[^.]+$/, "_audio.wav");
  
  try {
    // Extract audio: mono, 16kHz sample rate
    const ffmpegCmd = `ffmpeg -i "${videoFilePath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 -y "${audioPath}" 2>&1`;
    
    await execAsync(ffmpegCmd);
    
    console.log(`[Transcription] Audio extracted: ${audioPath}`);
    return audioPath;
  } catch (error: any) {
    console.error("[Transcription] Audio extraction failed:", error);
    throw new Error(`Failed to extract audio: ${error.message}`);
  }
}

/**
 * Step 2: Transcribe audio using OpenAI Whisper
 * Returns timestamped segments
 */
export async function transcribeAudio(audioFilePath: string): Promise<{
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}> {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "placeholder") {
      throw new Error("OPENAI_API_KEY not configured. Please add your OpenAI API key.");
    }

    // Use direct API call to avoid undici ByteString issues
    const response = await whisperTranscribe(audioFilePath);
    
    // Word timestamps come separately at the top level, not nested in segments
    const topLevelWords: WordTimestamp[] = response.words?.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end
    })) || [];

    // Match words to segments using overlap logic (not strict containment)
    // Small epsilon tolerance for boundary words
    const epsilon = 0.05; // 50ms tolerance for Whisper timing quirks
    
    const segments: TranscriptionSegment[] = response.segments?.map((seg: any) => {
      const segmentWords = topLevelWords.filter(w => 
        w.end > seg.start - epsilon && w.start < seg.end + epsilon
      ).sort((a, b) => a.start - b.start);
      
      if (segmentWords.length === 0) {
        console.warn(`[Transcription] Segment has no words: "${seg.text}" (${seg.start}-${seg.end}s)`);
      }
      
      return {
        start: seg.start,
        end: seg.end,
        text: utf8Safe(seg.text),
        words: segmentWords.map(w => ({ ...w, word: utf8Safe(w.word) }))
      };
    }) || [];

    console.log(`[Transcription] Transcribed ${segments.length} segments with ${topLevelWords.length} total words`);

    return {
      language: response.language || "en",
      duration: Math.round(response.duration || 0), // Round to integer for database
      segments
    };
  } catch (error: any) {
    console.error("[Transcription] Whisper API failed:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Step 3: Build caption chunks (strictly 3-4 words with word-level timestamps)
 * Uses actual Whisper word timing for precise synchronization
 */
export function buildCaptions(segments: TranscriptionSegment[]): Array<{
  start: number;
  end: number;
  text: string;
  words: WordTimestamp[];
}> {
  const captions: Array<{ start: number; end: number; text: string; words: WordTimestamp[] }> = [];

  for (const segment of segments) {
    const words = segment.words || [];
    
    if (words.length === 0) {
      // Fallback if no word-level data (shouldn't happen with word timestamps)
      console.warn(`[Transcription] No word data for segment: "${segment.text}"`);
      continue;
    }

    // Create strict 3-4 word chunks for optimal readability
    let i = 0;
    while (i < words.length) {
      const remainingWords = words.length - i;
      let chunkSize: number;

      if (remainingWords <= 4) {
        // If 4 or fewer words remain, take them all
        chunkSize = remainingWords;
      } else if (remainingWords === 5) {
        // If 5 words remain, split 3+2 instead of 3+1+1
        chunkSize = 3;
      } else {
        // Otherwise, take 3 words per chunk
        chunkSize = 3;
      }

      const chunk = words.slice(i, i + chunkSize);
      const caption = {
        start: chunk[0].start,
        end: chunk[chunk.length - 1].end,
        text: utf8Safe(chunk.map(w => w.word).join(' ')),
        words: chunk.map(w => ({ ...w, word: utf8Safe(w.word) }))
      };
      captions.push(caption);
      i += chunkSize;
    }
  }

  console.log(`[Transcription] Built ${captions.length} caption chunks with word-level timing`);
  return captions;
}

/**
 * Step 4: Viralize captions using GPT
 * Generates punchy, viral-style rewrites
 */
export async function viralizeText(text: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "placeholder") {
      return text;
    }

    const safeInput = utf8Safe(text);

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a viral content expert. Rewrite captions to be punchy, engaging, and viral-worthy (max 10 words). Keep the same meaning but make it more compelling. Only return the rewritten text, nothing else."
        },
        {
          role: "user",
          content: safeInput
        }
      ],
      max_tokens: 50,
      temperature: 0.8
    });

    const viralText = response.choices[0]?.message?.content?.trim() || text;
    return utf8Safe(viralText);
  } catch (error: any) {
    console.error("[Transcription] Viralization failed, using original:", error.message);
    return utf8Safe(text);
  }
}

/**
 * Step 5: Tag high-impact words for highlighting
 * Detects emotion, money, and urgency words
 */
export function tagHighlights(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const highlights: string[] = [];

  const allHighlightWords = [
    ...HIGHLIGHT_WORDS.emotion,
    ...HIGHLIGHT_WORDS.money,
    ...HIGHLIGHT_WORDS.urgency
  ];

  for (const word of words) {
    // Remove punctuation for matching
    const cleanWord = word.replace(/[.,!?;:]/g, "");
    
    if (allHighlightWords.includes(cleanWord)) {
      // Store original word (with punctuation) for accurate highlighting
      const originalWord = text.split(/\s+/).find(w => 
        w.toLowerCase().replace(/[.,!?;:]/g, "") === cleanWord
      );
      
      if (originalWord && !highlights.includes(originalWord)) {
        highlights.push(originalWord);
      }
    }
  }

  return highlights;
}

/**
 * Step 6: Attach visual metadata to each caption
 */
export function attachVisualMetadata(
  start: number,
  end: number,
  originalText: string,
  viralText: string,
  highlightWords: string[],
  words: WordTimestamp[]
): Caption {
  return {
    start,
    end,
    originalText: utf8Safe(originalText),
    viralText: utf8Safe(viralText),
    useViral: true,
    highlightWords: highlightWords.map(w => utf8Safe(w)),
    words: words.map(w => ({ ...w, word: utf8Safe(w.word) })),
    style: { ...CAPTION_STYLE }
  };
}

/**
 * Complete pipeline: video file → transcription with viral captions
 */
export async function transcribeVideo(videoFilePath: string): Promise<TranscriptionResult> {
  console.log(`[Transcription] Starting pipeline for: ${videoFilePath}`);

  // Step 1: Extract audio
  const audioPath = await extractAudio(videoFilePath);

  try {
    // Step 2: Transcribe with Whisper
    const { language, duration, segments } = await transcribeAudio(audioPath);

    // Step 3: Build caption chunks
    const captionChunks = buildCaptions(segments);

    // Steps 4-6: Viralize, highlight, and style each caption
    const captions: Caption[] = [];
    
    for (const chunk of captionChunks) {
      // Step 4: Viralize text
      const viralText = await viralizeText(chunk.text);
      
      // Step 5: Tag highlights
      const highlightWords = tagHighlights(viralText);
      
      // Step 6: Attach metadata
      const caption = attachVisualMetadata(
        chunk.start,
        chunk.end,
        chunk.text,
        viralText,
        highlightWords,
        chunk.words
      );
      
      captions.push(caption);
    }

    console.log(`[Transcription] Pipeline complete: ${captions.length} viral captions generated`);

    return {
      language,
      duration,
      captions
    };
  } finally {
    // Cleanup: delete temporary audio file
    try {
      await fs.unlink(audioPath);
      console.log(`[Transcription] Cleaned up audio file: ${audioPath}`);
    } catch (error) {
      console.warn(`[Transcription] Could not delete audio file: ${audioPath}`);
    }
  }
}
