import OpenAI from "openai";
import fetch from "node-fetch";
import type { OnboardingData } from "@shared/schema";
import { deepSanitize } from "../utils/sanitizeText";

/**
 * Sanitize text for OpenAI API to avoid ByteString encoding errors in undici.
 * This strips/replaces all characters that can't be safely sent via Node.js fetch.
 * 
 * Note: We preserve most Unicode for display, but the Node.js undici library
 * has issues with certain characters in the request body serialization.
 */
function sanitizeForOpenAI(text: string): string {
  if (!text) return "";
  
  // Common Unicode replacements to preserve meaning
  const replacements: Record<string, string> = {
    '\u2018': "'",  // Left single quote
    '\u2019': "'",  // Right single quote
    '\u201C': '"',  // Left double quote
    '\u201D': '"',  // Right double quote
    '\u2014': '-',  // Em dash
    '\u2013': '-',  // En dash
    '\u2026': '...', // Ellipsis
    '\u2028': '\n', // Line separator
    '\u2029': '\n', // Paragraph separator
    '\u00A0': ' ',  // Non-breaking space
    '\u2022': '-',  // Bullet
    '\u2192': '->', // Right arrow
    '\u2190': '<-', // Left arrow
  };
  
  let result = text.normalize("NFC");
  
  // Apply common replacements first
  for (const [char, replacement] of Object.entries(replacements)) {
    result = result.split(char).join(replacement);
  }
  
  // Replace any remaining non-ASCII characters with a safe representation
  // For OpenAI, we want the semantic meaning so we use character names when possible
  let finalResult = '';
  for (let i = 0; i < result.length; i++) {
    const code = result.charCodeAt(i);
    if (code <= 127) {
      // ASCII is always safe
      finalResult += result[i];
    } else if (code <= 255) {
      // Latin1 extended characters - should be safe but check
      finalResult += result[i];
    } else {
      // Unicode character > 255 - skip it to avoid ByteString error
      // TODO: Could be improved with transliteration library
      console.warn(`[openai] Skipping char U+${code.toString(16).toUpperCase()} at index ${i}`);
    }
  }
  
  return finalResult;
}

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required. Please add your OpenAI API key to use AI-powered content generation.");
  }
  // Use node-fetch instead of built-in fetch to avoid undici ByteString encoding issues
  return new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
}

interface ContentPlanResult {
  posts: Array<{
    weekNumber: number;
    dayNumber: number;
    title: string;
    concept: string;
    platform: string;
    shotList: Array<{
      id: string;
      shotNumber: number;
      instruction: string;
      cameraAngle: string;
      framing: string;
      dialogue: string;
      duration: number;
      completed: boolean;
    }>;
    brollSuggestions: string[];
    caption: string;
    hashtags: string[];
    musicVibe: string;
  }>;
}

export async function generateContentPlan(data: OnboardingData): Promise<ContentPlanResult> {
  const postFrequency = data.postFrequency || "standard";
  const postsPerWeek = postFrequency.includes("2-3") ? 2 : 
                       postFrequency.includes("4-5") ? 4 : 
                       postFrequency.includes("Daily") ? 7 : 3;

  const businessType = data.businessType || data.creatorType || "creator";
  const targetAudience = data.targetAudience || data.audienceDescription || "";
  const contentGoals = data.contentGoals || (data.contentGoal ? [data.contentGoal] : ["authority"]);
  const platforms = data.platforms || ["Instagram", "TikTok"];
  const tone = data.tone || data.brandPersonality || "professional";

  const prompt = `You are a professional social media content strategist. Generate a 4-week content calendar for the following business:

Brand: ${data.brandName}
Business Type: ${businessType}
Target Audience: ${targetAudience}
Content Goals: ${contentGoals.join(", ")}
Platforms: ${platforms.join(", ")}
Posting Frequency: ${postFrequency}
Tone: ${tone}

Create ${postsPerWeek} posts per week (total 4 weeks). For each post, provide:
1. Title (catchy, engaging)
2. Concept (brief description of the video idea)
3. Platform (choose from the provided platforms)
4. Shot list with 3-5 shots, each including:
   - Shot number
   - Clear instruction for what to film
   - Camera angle (e.g., "eye level", "slightly above", "low angle")
   - Framing (e.g., "close-up", "medium shot", "wide shot")
   - Dialogue (what to say, if applicable)
   - Duration in seconds (5-15 seconds per shot)
5. B-roll suggestions (2-3 items)
6. Caption (engaging, 1-2 sentences)
7. Hashtags (5-8 relevant tags without the # symbol)
8. Music vibe (e.g., "upbeat", "calm", "inspiring")

Return ONLY valid JSON matching this exact structure:
{
  "posts": [
    {
      "weekNumber": 1,
      "dayNumber": 1,
      "title": "string",
      "concept": "string",
      "platform": "string",
      "shotList": [
        {
          "id": "shot-1-1",
          "shotNumber": 1,
          "instruction": "string",
          "cameraAngle": "string",
          "framing": "string",
          "dialogue": "string",
          "duration": 10,
          "completed": false
        }
      ],
      "brollSuggestions": ["string"],
      "caption": "string",
      "hashtags": ["string"],
      "musicVibe": "string"
    }
  ]
}`;

  try {
    const openai = getOpenAIClient();
    
    // Clean prompt - replace problematic separators with newlines
    const safePrompt = prompt.replace(/[\u2028\u2029]/g, '\n');
    const systemMessage = "You are a professional social media content strategist. Always return valid JSON only, no markdown formatting.";
    
    console.log(`[openai] Sending prompt, length: ${safePrompt.length}`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: safePrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response from OpenAI");
    }
    
    // Clean the AI response before parsing - strip line/paragraph separators that cause issues
    const cleanedText = text
      .replace(/[\u2028\u2029]/g, '\n')  // Replace line/paragraph separators with newlines
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Remove control characters except newlines/tabs
    
    console.log(`[openai] Response received, length: ${cleanedText.length}`);
    
    const parsed = JSON.parse(cleanedText);
    return deepSanitize(parsed) as ContentPlanResult;
  } catch (error: any) {
    console.error("[openai] API error:", error.message);
    console.error("[openai] Full error:", JSON.stringify({
      status: error.status,
      code: error.code,
      type: error.type,
      message: error.message,
    }, null, 2));
    throw new Error(`Failed to generate content plan: ${error.message}`);
  }
}
