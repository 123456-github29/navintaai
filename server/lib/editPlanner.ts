import OpenAI from "openai";
import type { Clip, Post } from "@shared/schema";
import { ensureByteSafe } from "../utils/sanitizeText";
import { normalizeText, writeTempTextFile, cleanupTempFile } from "../utils/textBoundary";

export interface ClipSegment {
  clipId: string;
  clipFilename: string;
  startTime: number;
  endTime: number;
  includeInFinal: boolean;
  order: number;
}

export interface CaptionSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export interface EditPlan {
  clips: ClipSegment[];
  captions: CaptionSegment[];
  totalDuration: number;
  musicPrompt: string;
  vibe: string;
  generatedBy: "ai" | "fallback";
}

interface ClipMetadata {
  id: string;
  filename: string;
  duration: number;
  transcript: string | null;
  shotInstruction: string;
  dialogue: string;
}

export class EditPlanner {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async generateEditPlan(
    clips: Clip[],
    post: Post
  ): Promise<EditPlan> {
    console.log(`\n📋 Generating edit plan for "${post.title}"`);
    console.log(`   Clips: ${clips.length}`);
    console.log(`   Total raw duration: ${clips.reduce((sum, c) => sum + c.duration, 0)}s`);

    const clipMetadata = this.prepareClipMetadata(clips, post);

    // Use fast fallback plan by default for speed
    // AI planning adds latency and often returns invalid clip IDs
    console.log("   Using fast merge plan...");
    return this.generateFallbackEditPlan(clipMetadata, post);
  }

  private prepareClipMetadata(clips: Clip[], post: Post): ClipMetadata[] {
    return clips.map((clip) => {
      const shot = post.shotList.find((s) => s.id === clip.shotId);
      return {
        id: clip.id,
        filename: clip.filename || `clip-${clip.id.substring(0, 8)}`,
        duration: clip.duration,
        transcript: clip.transcript,
        shotInstruction: shot?.instruction || "Unknown shot",
        dialogue: shot?.dialogue || "",
      };
    });
  }

  private async generateAIEditPlan(
    clipMetadata: ClipMetadata[],
    post: Post
  ): Promise<EditPlan> {
    const prompt = ensureByteSafe(this.buildEditPlanPrompt(clipMetadata, post));

    const response = await this.openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional video editor specializing in short-form social media content. You analyze raw footage and create optimal edit plans.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    const sanitizedContent = ensureByteSafe(content);
    const parsed = JSON.parse(sanitizedContent);
    const plan = this.validateAndNormalizeEditPlan(parsed, clipMetadata);
    
    // If AI plan resulted in 0 clips, fall back to simple plan
    if (plan.clips.length === 0) {
      console.warn("   AI plan resulted in 0 valid clips, falling back to simple plan");
      return this.generateFallbackEditPlan(clipMetadata, post);
    }
    
    return plan;
  }

  private buildEditPlanPrompt(
    clipMetadata: ClipMetadata[],
    post: Post
  ): string {
    const clipsInfo = clipMetadata
      .map(
        (c, i) =>
          `Clip ${i + 1}:
  - ID: ${c.id}
  - Filename: ${c.filename}
  - Duration: ${c.duration}s
  - Instruction: ${c.shotInstruction}
  - Dialogue: ${c.dialogue}
  - Transcript: ${c.transcript || "None"}`
      )
      .join("\n\n");

    return `You are editing a social media video for "${post.platform}" with the following details:

Title: ${post.title}
Concept: ${post.concept}
Final Caption: ${post.caption}
Music Vibe: ${post.musicVibe}

Available Clips:
${clipsInfo}

Create an edit plan that:
1. Orders clips for maximum impact and storytelling flow
2. Trims clips if needed (remove dead air, mistakes, or redundancy)
3. Decides which clips to include or skip
4. Generates caption timing based on what's actually said
5. Suggests a music prompt based on the vibe

Return ONLY valid JSON in this exact format:
{
  "clips": [
    {
      "clipId": "clip-id-here",
      "clipFilename": "filename",
      "startTime": 0,
      "endTime": 10,
      "includeInFinal": true,
      "order": 1
    }
  ],
  "captions": [
    {
      "text": "Caption text here",
      "startTime": 2.5,
      "endTime": 5.0
    }
  ],
  "musicPrompt": "Upbeat electronic music for fitness content",
  "vibe": "energetic and motivational"
}

Guidelines:
- Keep total duration under 60 seconds for best social media performance
- Use startTime/endTime to trim dead air or mistakes
- Create 3-5 caption segments that highlight key points
- Caption timing should sync with spoken words (use transcript when available)
- Skip clips with major issues (use "includeInFinal": false)
- Order clips for storytelling: hook → value → call-to-action`;
  }

  private validateAndNormalizeEditPlan(
    rawPlan: any,
    clipMetadata: ClipMetadata[]
  ): EditPlan {
    const clips: ClipSegment[] = [];
    let totalDuration = 0;

    for (const clipPlan of rawPlan.clips || []) {
      const metadata = clipMetadata.find((c) => c.id === clipPlan.clipId);
      if (!metadata) {
        console.warn(`   Clip ${clipPlan.clipId} not found, skipping`);
        continue;
      }

      const startTime = Math.max(0, clipPlan.startTime || 0);
      const endTime = Math.min(
        metadata.duration,
        clipPlan.endTime || metadata.duration
      );

      if (clipPlan.includeInFinal !== false) {
        clips.push({
          clipId: metadata.id,
          clipFilename: metadata.filename,
          startTime,
          endTime,
          includeInFinal: true,
          order: clipPlan.order || clips.length + 1,
        });
        totalDuration += endTime - startTime;
      }
    }

    clips.sort((a, b) => a.order - b.order);

    const captions: CaptionSegment[] = (rawPlan.captions || [])
      .filter((c: any) => c.text && c.startTime !== undefined)
      .map((c: any) => ({
        text: ensureByteSafe(c.text),
        startTime: c.startTime,
        endTime: c.endTime || c.startTime + 2,
      }));

    console.log(`   ✓ AI Plan: ${clips.length} clips, ${captions.length} captions, ${Math.round(totalDuration)}s total`);

    return {
      clips,
      captions,
      totalDuration,
      musicPrompt: rawPlan.musicPrompt || "Background music",
      vibe: rawPlan.vibe || "neutral",
      generatedBy: "ai",
    };
  }

  private generateFallbackEditPlan(
    clipMetadata: ClipMetadata[],
    post: Post
  ): EditPlan {
    const clips: ClipSegment[] = clipMetadata.map((clip, index) => ({
      clipId: clip.id,
      clipFilename: clip.filename,
      startTime: 0,
      endTime: clip.duration,
      includeInFinal: true,
      order: index + 1,
    }));

    const totalDuration = clipMetadata.reduce(
      (sum, clip) => sum + clip.duration,
      0
    );

    const captions: CaptionSegment[] = [];
    let currentTime = 0;

    for (const clip of clipMetadata) {
      if (clip.dialogue && clip.dialogue.trim()) {
        captions.push({
          text: ensureByteSafe(clip.dialogue),
          startTime: currentTime + 0.5,
          endTime: currentTime + clip.duration - 0.5,
        });
      }
      currentTime += clip.duration;
    }

    console.log(`   ✓ Fallback Plan: ${clips.length} clips, ${captions.length} captions, ${Math.round(totalDuration)}s total`);

    return {
      clips,
      captions,
      totalDuration,
      musicPrompt: post.musicVibe || "Background music",
      vibe: post.musicVibe || "neutral",
      generatedBy: "fallback",
    };
  }

  convertToSRT(captions: CaptionSegment[]): string {
    return captions
      .map((caption, index) => {
        const startTimeFormatted = this.formatSRTTime(caption.startTime);
        const endTimeFormatted = this.formatSRTTime(caption.endTime);
        const safeText = normalizeText(caption.text);
        return `${index + 1}\n${startTimeFormatted} --> ${endTimeFormatted}\n${safeText}\n`;
      })
      .join("\n");
  }

  async writeSRTFile(captions: CaptionSegment[]): Promise<string> {
    const srtContent = this.convertToSRT(captions);
    return writeTempTextFile(srtContent);
  }

  async cleanupSRTFile(filePath: string): Promise<void> {
    return cleanupTempFile(filePath);
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
  }
}

export const editPlanner = new EditPlanner();
