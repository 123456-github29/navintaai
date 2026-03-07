import type { OnboardingData } from "@shared/schema";
import { deepSanitize } from "../utils/sanitizeText";
import { retryWithBackoff } from "./geminiRetry";
import { chatJSON } from "./openaiClient";

type VideoMode = "single-shot" | "minimal-shots" | "multi-shot" | "cinematic";

interface ContentPlanResult {
  posts: Array<{
    weekNumber: number;
    dayNumber: number;
    title: string;
    concept: string;
    platform: string;
    duration: number;
    videoMode: VideoMode;
    script: string;
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
    performanceNotes: string;
  }>;
}

// STEP 3: Script length requirements based on duration
function getScriptWordRange(durationSeconds: number): { min: number; max: number } {
  if (durationSeconds <= 15) return { min: 50, max: 70 };
  if (durationSeconds <= 30) return { min: 100, max: 130 };
  if (durationSeconds <= 45) return { min: 160, max: 200 };
  if (durationSeconds <= 60) return { min: 220, max: 260 };
  if (durationSeconds <= 90) return { min: 350, max: 450 };
  return { min: 400, max: 550 };
}

// STEP 2: Shot generation rules based on video mode
function getShotRules(videoMode: VideoMode): { minShots: number; maxShots: number; allowBroll: boolean; cameraChanges: boolean } {
  switch (videoMode) {
    case "single-shot":
      return { minShots: 1, maxShots: 1, allowBroll: false, cameraChanges: false };
    case "minimal-shots":
      return { minShots: 1, maxShots: 2, allowBroll: false, cameraChanges: false };
    case "multi-shot":
      return { minShots: 3, maxShots: 5, allowBroll: true, cameraChanges: true };
    case "cinematic":
      return { minShots: 4, maxShots: 7, allowBroll: true, cameraChanges: true };
    default:
      return { minShots: 1, maxShots: 3, allowBroll: false, cameraChanges: false };
  }
}

function getDurationRange(durationType: string): { min: number; max: number } {
  switch (durationType) {
    case "quick": return { min: 15, max: 25 };
    case "standard": return { min: 30, max: 45 };
    case "story": return { min: 60, max: 90 };
    case "deep-dive": return { min: 90, max: 120 };
    default: return { min: 30, max: 45 };
  }
}

export async function generateContentPlanWithGemini(data: OnboardingData): Promise<ContentPlanResult> {
  const durationType = data.durationType || "standard";
  const durationRange = getDurationRange(durationType);
  const targetDuration = Math.round((durationRange.min + durationRange.max) / 2);
  const scriptWordRange = getScriptWordRange(targetDuration);
  
  const brandName = data.brandName;
  const brandDescription = data.brandDescription || "";
  const audienceDescription = data.audienceDescription || data.targetAudience || "";
  const personality = data.brandPersonality || data.tone || "professional";
  const goal = data.contentGoal || (data.contentGoals?.[0]) || "authority";
  const cameraComfort = data.cameraComfort || "somewhat-comfortable";
  const emotion = data.emotionalResult || "confident";
  const creatorType = data.creatorType || "solo-creator";
  
  const totalPosts = 8;

  // STEP 1: Video Mode Classifier reasoning
  const videoModeGuidance = `
STEP 1: VIDEO MODE CLASSIFICATION (CRITICAL - DO THIS FIRST FOR EACH VIDEO)

Before writing ANY content for each video, you MUST reason about the video structure:

Analyze these factors:
- Creator type: ${creatorType}
- Content goal: ${goal}
- Platform: Instagram/TikTok
- Video duration: ${targetDuration}s
- Brand tone: ${personality}
- Camera comfort: ${cameraComfort}

Then select ONE video_mode from:
1. "single-shot" - ONE continuous shot, no cuts
   - Best for: direct advice, personal stories, reactions, quick tips
   - Talking head with no camera changes
   - Camera: eye level, medium or medium-close framing
   - NO b-roll, NO cutaways

2. "minimal-shots" - 1-2 shots maximum
   - Best for: demonstrations, before/after, simple tutorials
   - Only add second shot if it adds MEANING
   - Minimal camera movement

3. "multi-shot" - 3-5 shots
   - Best for: tutorials, processes, reviews, comparisons
   - Each shot must have a VISUAL PURPOSE
   - Planned camera changes

4. "cinematic" - 4-7 shots with b-roll
   - Best for: storytelling, brand films, day-in-the-life, emotional content
   - Allow cutaways, transitions, visual variety

CRITICAL RULES:
- Short videos (15-30s) are almost ALWAYS "single-shot" or "minimal-shots"
- Solo creators talking to camera = "single-shot" unless showing something
- DO NOT add extra shots "for variety" - that makes recordings awkward
- If ${cameraComfort} is "nervous" or "somewhat-comfortable", prefer "single-shot"
`;

  // STEP 2: Shot generation rules
  const shotRulesGuidance = `
STEP 2: SHOT GENERATION RULES

If video_mode = "single-shot":
- Generate EXACTLY 1 shot
- Camera: eye level ONLY
- Framing: medium OR medium-close ONLY
- NO b-roll suggestions
- NO camera angle changes
- The entire script goes in this ONE shot

If video_mode = "minimal-shots":
- Generate 1-2 shots MAX
- Only add second shot if showing something different (product, demo, etc.)
- Keep camera simple

If video_mode = "multi-shot":
- Generate 3-5 shots
- Each shot must serve a VISUAL purpose (not just script breaks)

If video_mode = "cinematic":
- Generate 4-7 shots
- Can include b-roll suggestions
- Creative camera work allowed
`;

  // STEP 3: Script length enforcement
  const scriptLengthGuidance = `
STEP 3: SCRIPT LENGTH REQUIREMENTS (CRITICAL)

For a ${targetDuration} second video, the script MUST be ${scriptWordRange.min}-${scriptWordRange.max} words.

Word count guidelines by duration:
- 15s = 50-70 words
- 30s = 100-130 words
- 45s = 160-200 words  
- 60s = 220-260 words
- 90s = 350-450 words

Scripts that are too short make awkward, rushed videos.
COUNT THE WORDS. If under minimum, ADD MORE CONTENT.
`;

  // STEP 4: Human script style
  const scriptStyleGuidance = `
STEP 4: HUMAN SCRIPT STYLE

Scripts must SOUND like a person TALKING, not writing.

REQUIRED elements:
- Natural pauses marked with "..."
- Thinking language: "you know what I mean?", "here's the thing...", "and honestly..."
- Emphasis with *asterisks* on key words
- Repetition for impact: "This works. It really works."
- Building ideas: Start simple, then go deeper
- Conversational asides: "okay but seriously...", "wait, let me explain..."

SCRIPT STRUCTURE (not rigid, but general flow):
1. Hook (grab attention, create curiosity)
2. Context (why should they care)
3. Insight (the valuable idea or tip)
4. Example or proof (make it concrete)
5. Takeaway (what to remember)
6. Soft CTA (optional, natural ending)

DO NOT:
- Use generic motivational tone ("you've got this!", "crush your goals!")
- Write one-liner tweets disguised as scripts
- Use marketing copy voice
- Sound like ChatGPT wrote it
- Use cliches or buzzwords

The creator will READ THIS OUT LOUD. It must feel natural in their mouth.
`;

  const systemPrompt = `You are Navinta AI - a Hollywood director that thinks before writing.

Navinta AI is NOT a generic content generator. Navinta AI is an AI director that:
- Reasons about video structure BEFORE generating content
- Understands when to let the creator just talk vs. when to plan shots
- Creates scripts that sound human, not AI
- Never over-generates shots for simple talking-head videos

${videoModeGuidance}

${shotRulesGuidance}

${scriptLengthGuidance}

${scriptStyleGuidance}

=== CREATOR CONTEXT ===

Brand:
Name: ${brandName}
Description: ${brandDescription}

Audience:
${audienceDescription}

Tone/Personality: ${personality}
Content Goal: ${goal}
Creator Type: ${creatorType}
Camera Comfort: ${cameraComfort}
Target Duration: ${targetDuration}s (range: ${durationRange.min}-${durationRange.max}s)
Desired Viewer Emotion: ${emotion}

${cameraComfort === "voice-over" ? "NOTE: Creator prefers VOICE-OVER. Scripts should NOT reference on-camera presence." : ""}
${cameraComfort === "nervous" ? "NOTE: Creator is NERVOUS on camera. Keep scripts simple, conversational, and forgiving. Prefer single-shot to reduce anxiety." : ""}
`;

  const userPrompt = `Create ${totalPosts} unique video posts spread across 2 weeks (4 posts per week).

FOR EACH POST:
1. First decide video_mode based on the content type and creator context
2. Then write a full script (${scriptWordRange.min}-${scriptWordRange.max} words)
3. Then generate shots ONLY as needed by video_mode
4. Add performance notes for delivery

Return ONLY valid JSON matching this exact structure:
{
  "posts": [
    {
      "weekNumber": 1,
      "dayNumber": 1,
      "title": "Catchy specific title",
      "concept": "Why this video works for the audience",
      "platform": "Instagram",
      "duration": ${targetDuration},
      "videoMode": "single-shot",
      "script": "Full natural script with pauses... and *emphasis* that sounds human and fills the duration. Must be ${scriptWordRange.min}-${scriptWordRange.max} words for ${targetDuration}s video. Include thinking language, repetition, building ideas... you know what I mean? Make it sound like *you* talking, not an AI.",
      "shotList": [
        {"id": "shot-1-1", "shotNumber": 1, "instruction": "Look at camera, conversational tone", "cameraAngle": "eye level", "framing": "medium-close", "dialogue": "Full script here for single-shot", "duration": ${targetDuration}, "completed": false}
      ],
      "brollSuggestions": [],
      "caption": "Engaging caption without hashtags",
      "hashtags": ["relevant", "tags", "here"],
      "musicVibe": "specific mood description",
      "performanceNotes": "Speak naturally, like you're telling a friend. Pause after the hook. Emphasize the key insight."
    }
  ]
}

VALIDATION BEFORE RETURNING:
- If videoMode is "single-shot", shotList must have EXACTLY 1 shot
- If videoMode is "minimal-shots", shotList must have 1-2 shots
- Script word count must be at least ${scriptWordRange.min} words
- Each shot must have a clear purpose

Create ${totalPosts} posts total. Week 1 has dayNumber 1-4, Week 2 has dayNumber 1-4.`;

  try {
    console.log(`[ai] Sending premium director prompt for ${brandName}`);
    console.log(`[ai] Duration type: ${durationType}, Personality: ${personality}, Goal: ${goal}`);
    
    const text = await retryWithBackoff(() => chatJSON({
      system: systemPrompt + "\n\nReturn ONLY valid JSON.",
      user: userPrompt,
    }));
    
    console.log(`[ai] Response received, length: ${text.length}`);
    
    const cleanedText = text
      .replace(/[\u2028\u2029]/g, '\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    const parsed = JSON.parse(cleanedText);
    console.log(`[ai] Parsed posts count: ${parsed.posts?.length || 0}`);
    
    if (!parsed.posts || parsed.posts.length === 0) {
      console.error("[ai] No posts in response:", JSON.stringify(parsed).substring(0, 500));
      throw new Error("AI returned empty posts array");
    }
    
    // STEP 6: Validation
    const validatedPosts = parsed.posts.map((post: any, index: number) => {
      const videoMode = post.videoMode || "single-shot";
      const shotRules = getShotRules(videoMode as VideoMode);
      const shotCount = post.shotList?.length || 0;
      
      // Validate shot count matches video mode
      if (videoMode === "single-shot" && shotCount > 1) {
        console.warn(`[ai] Post ${index + 1}: single-shot mode but has ${shotCount} shots, trimming to 1`);
        post.shotList = post.shotList.slice(0, 1);
        // Consolidate all dialogue into the single shot
        if (post.shotList[0]) {
          post.shotList[0].dialogue = post.script;
          post.shotList[0].duration = post.duration;
        }
      } else if (videoMode === "minimal-shots" && shotCount > 2) {
        console.warn(`[ai] Post ${index + 1}: minimal-shots mode but has ${shotCount} shots, trimming to 2`);
        post.shotList = post.shotList.slice(0, 2);
      }
      
      // Validate script length
      const wordCount = post.script?.split(/\s+/).filter((w: string) => w.length > 0).length || 0;
      const expectedMin = getScriptWordRange(post.duration || targetDuration).min;
      if (wordCount < expectedMin * 0.7) {
        console.warn(`[ai] Post ${index + 1}: Script too short (${wordCount} words, expected ${expectedMin}+)`);
      }
      
      // Ensure required fields exist
      if (!post.performanceNotes) {
        post.performanceNotes = "Speak naturally and conversationally. Pause for emphasis where marked.";
      }
      if (!post.videoMode) {
        post.videoMode = "single-shot";
      }
      
      // Clear b-roll for single-shot and minimal-shots
      if ((videoMode === "single-shot" || videoMode === "minimal-shots") && post.brollSuggestions?.length > 0) {
        console.log(`[ai] Post ${index + 1}: Clearing b-roll for ${videoMode} mode`);
        post.brollSuggestions = [];
      }
      
      return post;
    });
    
    parsed.posts = validatedPosts;
    console.log(`[ai] Validation complete. Posts validated: ${validatedPosts.length}`);
    
    return deepSanitize(parsed) as ContentPlanResult;
  } catch (error: any) {
    console.error("[ai] API error:", error.message);
    throw new Error(`Failed to generate content plan: ${error.message}`);
  }
}

export async function editContentPlanWithGemini(
  currentPlan: ContentPlanResult,
  editRequest: string,
  onboardingData: OnboardingData
): Promise<ContentPlanResult> {
  const brandName = onboardingData.brandName;
  const personality = onboardingData.brandPersonality || onboardingData.tone || "professional";
  
  const systemPrompt = `You are a Hollywood director, documentary editor, and viral content strategist combined.

You have created a content plan and now the creator wants to make changes.

Current Brand: ${brandName}
Personality: ${personality}

Your job:
Modify the existing content plan based on the creator's request while maintaining:
- Professional quality
- Human-sounding scripts
- Cinematic intention
- Emotional pacing

Keep the same JSON structure. Only modify what's requested.
Return ONLY valid JSON.`;

  const userPrompt = `Here is the current content plan:

${JSON.stringify(currentPlan, null, 2)}

---

Creator's edit request:
"${editRequest}"

---

Apply the requested changes and return the COMPLETE modified content plan as JSON.
Maintain the exact same structure but update content based on the request.`;

  try {
    console.log(`[ai] Editing plan for ${brandName}: "${editRequest.substring(0, 50)}..."`);
    
    const text = await retryWithBackoff(() => chatJSON({
      system: systemPrompt,
      user: userPrompt,
    }));
    
    const cleanedText = text
      .replace(/[\u2028\u2029]/g, '\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    const parsed = JSON.parse(cleanedText);
    
    if (!parsed.posts || parsed.posts.length === 0) {
      throw new Error("AI returned empty posts array");
    }
    
    const validatedPosts = parsed.posts.map((post: any) => {
      if (!post.videoMode) {
        post.videoMode = "single-shot";
      }
      if (!post.performanceNotes) {
        post.performanceNotes = "Speak naturally and conversationally.";
      }
      return post;
    });
    
    parsed.posts = validatedPosts;
    console.log(`[ai] Plan edited successfully, ${parsed.posts.length} posts`);
    
    return deepSanitize(parsed) as ContentPlanResult;
  } catch (error: any) {
    console.error("[ai] Edit API error:", error.message);
    throw new Error(`Failed to edit content plan: ${error.message}`);
  }
}
