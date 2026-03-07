import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Clip, Post } from "@shared/schema";
import { editPlanner, type EditPlan } from "./editPlanner";
import { downloadClipToTemp, uploadVideoToStorage, isStorageAvailable } from "./supabaseStorage";

// Use consistent uploads directory at project root (aligned with routes.ts)
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const CLIPS_DIR = path.join(UPLOADS_DIR, "clips");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");
const TEMP_DIR = path.join(UPLOADS_DIR, "temp");
const MUSIC_DIR = path.join(process.cwd(), "server/assets/music");

interface ProcessingOptions {
  clips: Clip[];
  post: Post;
  hasCaption: boolean;
  musicStyle: string;
}

const MUSIC_FILES: Record<string, string> = {
  "Upbeat & Energetic": "upbeat.mp3",
  "Calm & Relaxing": "calm.mp3",
  "Inspirational": "inspirational.mp3",
  "Corporate & Professional": "corporate.mp3",
  "Fun & Playful": "fun.mp3",
};

export class VideoProcessor {
  async processVideo(options: ProcessingOptions): Promise<string> {
    const { clips, post, hasCaption, musicStyle } = options;

    if (clips.length === 0) {
      throw new Error("No clips to process");
    }

    console.log(`\n🎬 Starting video processing for "${post.title}"`);
    console.log(`   Clips: ${clips.length}`);
    console.log(`   Caption: ${hasCaption ? "Yes" : "No"}`);
    console.log(`   Music: ${musicStyle}`);

    const jobId = randomUUID();
    const videoId = `video-${jobId}.mp4`;
    const outputPath = path.join(VIDEOS_DIR, videoId);
    const trackedTempFiles: string[] = [];

    try {
      const editPlan = await editPlanner.generateEditPlan(clips, post);
      
      console.log(`\n📐 Edit Plan Generated (${editPlan.generatedBy}):`);
      console.log(`   Final clips: ${editPlan.clips.length}`);
      console.log(`   Captions: ${editPlan.captions.length}`);
      console.log(`   Total duration: ${Math.round(editPlan.totalDuration)}s`);

      const clipPaths = await this.prepareClips(clips, editPlan, jobId, trackedTempFiles);
      
      if (clipPaths.length === 0) {
        throw new Error(
          "No clips to process after applying edit plan. All clips were skipped or invalid."
        );
      }

      const tempVideoPath = path.join(TEMP_DIR, `merged-${jobId}.mp4`);
      trackedTempFiles.push(tempVideoPath);

      if (clipPaths.length === 1) {
        await this.processSingleClip(
          clipPaths[0],
          editPlan,
          tempVideoPath,
          hasCaption,
          trackedTempFiles,
          jobId
        );
      } else {
        await this.mergeAndProcessClips(
          clipPaths,
          editPlan,
          tempVideoPath,
          hasCaption,
          trackedTempFiles,
          jobId
        );
      }

      const tempVideoExists = await fs
        .access(tempVideoPath)
        .then(() => true)
        .catch(() => false);

      if (!tempVideoExists) {
        throw new Error("Video processing completed but output file not found");
      }

      const musicFile = MUSIC_FILES[musicStyle] || MUSIC_FILES["Upbeat & Energetic"];
      const musicPath = path.join(MUSIC_DIR, musicFile);
      const musicExists = await fs
        .access(musicPath)
        .then(() => true)
        .catch(() => false);

      if (musicExists) {
        console.log("\n🎵 Adding background music...");
        try {
          await this.overlayMusic(tempVideoPath, musicPath, outputPath);
          await fs.unlink(tempVideoPath).catch(() => {});
        } catch (musicError: any) {
          console.error(`\n⚠️  Music overlay failed: ${musicError.message}`);
          console.log("   Using video without background music");
          await fs.rename(tempVideoPath, outputPath).catch(() => {
            throw new Error("Failed to save video after music overlay failure");
          });
        }
      } else {
        console.warn(`\n⚠️  Music file not found: ${musicPath}`);
        console.log("   Video will be exported without background music");
        await fs.rename(tempVideoPath, outputPath);
      }

      console.log(`\n✅ Video processing complete: ${videoId}\n`);
      return videoId;
    } catch (error: any) {
      console.error("\n❌ Video processing error:", error);
      console.error("   Stack:", error.stack);
      // Preserve the original error message for debugging
      const message = error.message || "Unknown video processing error";
      throw new Error(`Failed to process video: ${message}`);
    } finally {
      for (const tempFile of trackedTempFiles) {
        await fs.unlink(tempFile).catch(() => {});
      }
    }
  }

  /**
   * Check if videoData is a file path (new format) vs base64 (legacy format)
   * File paths are stored with 'uploads/' prefix
   */
  private isFilePath(videoData: string): boolean {
    if (!videoData) return false;
    
    // New format: file paths always start with 'uploads/'
    if (videoData.startsWith('uploads/')) return true;
    
    // Everything else is legacy base64 (data: URL or raw base64)
    return false;
  }

  private async prepareClips(
    clips: Clip[],
    editPlan: EditPlan,
    jobId: string,
    trackedTempFiles: string[]
  ): Promise<string[]> {
    console.log("\n🎞️  Preparing clip files...");
    const clipPaths: string[] = [];

    for (const segment of editPlan.clips) {
      if (!segment.includeInFinal) {
        console.log(`   ⏭️  Skipping: ${segment.clipFilename}`);
        continue;
      }

      const clip = clips.find((c) => c.id === segment.clipId);
      if (!clip) {
        console.warn(`   ⚠️  Clip ${segment.clipId} not found, skipping`);
        continue;
      }

      let originalPath: string;
      let isTempFile = true; // Track if this needs cleanup

      // NEW: Check for Supabase Storage path first
      if (clip.videoPath) {
        console.log(`   ☁️  Downloading from Supabase: ${clip.videoPath}`);
        try {
          originalPath = await downloadClipToTemp(clip.videoPath, TEMP_DIR);
          trackedTempFiles.push(originalPath);
          console.log(`   ✓ Downloaded to: ${originalPath}`);
        } catch (downloadError: any) {
          console.error(`   ❌ Failed to download clip ${clip.id}:`, downloadError.message);
          continue;
        }
      } else if (clip.videoData) {
        // LEGACY: Handle old videoData (file path or base64)
        const isPath = this.isFilePath(clip.videoData);
        const isBase64 = clip.videoData.startsWith('data:') || 
                         /^[A-Za-z0-9+/=]+$/.test(clip.videoData.substring(0, 100));
        
        if (!isPath && !isBase64) {
          console.error(`   ❌ Invalid videoData format for clip ${clip.id}`);
          continue;
        }
        
        if (isPath) {
          originalPath = path.join(process.cwd(), clip.videoData);
          isTempFile = false; // Don't delete stored files
          console.log(`   📁 Using legacy file path: ${originalPath}`);
          
          try {
            await fs.access(originalPath);
          } catch {
            console.error(`   ❌ File not found: ${originalPath}`);
            continue;
          }
        } else {
          originalPath = await this.saveBase64AsFile(
            clip.videoData,
            `job-${jobId}-clip${segment.order}.webm`
          );
          trackedTempFiles.push(originalPath);
        }
      } else {
        console.error(`   ❌ Clip ${clip.id} has no video data`);
        continue;
      }

      const trimStart = segment.startTime;
      const trimEnd = segment.endTime;
      const needsTrimming = trimStart > 0 || trimEnd < clip.duration;

      if (needsTrimming) {
        console.log(
          `   ✂️  Trimming: ${segment.clipFilename} (${trimStart}s-${trimEnd}s)`
        );
        const trimmedPath = await this.trimClip(
          originalPath,
          trimStart,
          trimEnd,
          segment.order,
          jobId,
          trackedTempFiles
        );
        clipPaths.push(trimmedPath);
        // Only delete temp files, never delete stored files
        if (isTempFile) {
          await fs.unlink(originalPath).catch(() => {});
        }
      } else {
        console.log(`   ✓ Using full clip: ${segment.clipFilename}`);
        clipPaths.push(originalPath);
      }
    }

    return clipPaths;
  }

  private async trimClip(
    inputPath: string,
    startTime: number,
    endTime: number,
    order: number,
    jobId: string,
    trackedTempFiles: string[]
  ): Promise<string> {
    const inputExt = path.extname(inputPath) || '.mp4';
    
    // For mp4 input, use copy codec and keep .mp4
    // For webm input, re-encode to H.264/AAC and output as .mp4 (for compatibility)
    const isMp4Input = inputExt === '.mp4';
    const outputExt = '.mp4'; // Always output mp4 for consistent processing
    const outputPath = path.join(TEMP_DIR, `job-${jobId}-trimmed${order}${outputExt}`);
    trackedTempFiles.push(outputPath);

    return new Promise((resolve, reject) => {
      const cmd = ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime);
      
      if (isMp4Input) {
        // Copy streams for mp4 input (fast)
        cmd.outputOptions(["-c copy", "-movflags +faststart"]);
      } else {
        // Re-encode webm to H.264/AAC mp4 (compatible)
        cmd.outputOptions([
          "-c:v libx264",
          "-c:a aac", 
          "-preset ultrafast",
          "-movflags +faststart"
        ]);
      }
      
      cmd.output(outputPath)
        .on("end", () => resolve(outputPath))
        .on("error", (err) => {
          console.error("Trim error:", err);
          reject(err);
        })
        .run();
    });
  }

  private async processSingleClip(
    inputPath: string,
    editPlan: EditPlan,
    outputPath: string,
    hasCaption: boolean,
    trackedTempFiles: string[],
    jobId: string
  ): Promise<void> {
    console.log("\n🎬 Processing single clip with encoding (no burned captions)...");

    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);
      
      const videoFilters: any[] = [
        "scale=1080:1920:force_original_aspect_ratio=decrease",
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2"
      ];

      command
        .videoFilters(videoFilters)
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 24",
          "-vsync 0", // Preserve original frame timing
          "-threads 0", // Use all available CPU threads
          "-c:a aac",
          "-b:a 128k",
          "-movflags +faststart",
        ]);

      command
        .output(outputPath)
        .on("start", (cmd) => console.log("   FFmpeg:", cmd.substring(0, 100) + "..."))
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`   Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", () => {
          console.log("   ✓ Single clip processed");
          resolve();
        })
        .on("error", (err) => {
          console.error("   ❌ FFmpeg error:", err.message);
          reject(err);
        })
        .run();
    });
  }

  private async mergeAndProcessClips(
    clipPaths: string[],
    editPlan: EditPlan,
    outputPath: string,
    hasCaption: boolean,
    trackedTempFiles: string[],
    jobId: string
  ): Promise<void> {
    console.log(`\n🔗 Merging ${clipPaths.length} clips (no burned captions)...`);
    const concatFilePath = path.join(TEMP_DIR, `concat-${jobId}.txt`);
    trackedTempFiles.push(concatFilePath);
    const fileListContent = clipPaths.map((p) => `file '${p}'`).join("\n");
    await fs.writeFile(concatFilePath, fileListContent);

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(concatFilePath)
        .inputOptions(["-f concat", "-safe 0"]);

      const videoFilters: any[] = [
        "scale=1080:1920:force_original_aspect_ratio=decrease",
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2"
      ];

      command
        .videoFilters(videoFilters)
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 24",
          "-vsync 0", // Preserve original frame timing
          "-threads 0", // Use all available CPU threads
          "-c:a aac",
          "-b:a 128k",
          "-movflags +faststart",
        ]);

      command
        .output(outputPath)
        .on("start", (cmd) => console.log("   FFmpeg:", cmd.substring(0, 100) + "..."))
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`   Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", async () => {
          await fs.unlink(concatFilePath).catch(() => {});
          console.log("   ✓ Clips merged successfully");
          resolve();
        })
        .on("error", async (err) => {
          await fs.unlink(concatFilePath).catch(() => {});
          console.error("   ❌ Merge error:", err.message);
          reject(err);
        })
        .run();
    });
  }

  private async hasAudioStream(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          resolve(false);
          return;
        }
        const hasAudio = metadata.streams.some((s) => s.codec_type === "audio");
        resolve(hasAudio);
      });
    });
  }

  private async overlayMusic(
    videoPath: string,
    musicPath: string,
    outputPath: string
  ): Promise<void> {
    const videoHasAudio = await this.hasAudioStream(videoPath);
    console.log(`   Video has audio stream: ${videoHasAudio}`);

    return new Promise((resolve, reject) => {
      const cmd = ffmpeg()
        .input(videoPath)
        .input(musicPath);

      if (videoHasAudio) {
        cmd.complexFilter([
          "[0:a]volume=1.0[original]",
          "[1:a]volume=0.2[music]",
          "[original][music]amix=inputs=2:duration=first[audio]",
        ])
        .outputOptions([
          "-map 0:v",
          "-map [audio]",
          "-c:v copy",
          "-c:a aac",
          "-b:a 192k",
          "-movflags +faststart",
        ]);
      } else {
        cmd.outputOptions([
          "-map 0:v",
          "-map 1:a",
          "-c:v copy",
          "-c:a aac",
          "-b:a 192k",
          "-shortest",
          "-movflags +faststart",
        ]);
      }

      cmd.output(outputPath)
        .on("start", (cmdStr) => console.log("   FFmpeg:", cmdStr.substring(0, 100) + "..."))
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`   Music overlay: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", () => {
          console.log("   ✓ Music overlay complete");
          resolve();
        })
        .on("error", (err) => {
          console.error("   ❌ Music overlay error:", err.message);
          reject(err);
        })
        .run();
    });
  }

  private async saveBase64AsFile(
    base64Data: string,
    filename: string
  ): Promise<string> {
    if (!base64Data || base64Data.length === 0) {
      throw new Error(`No video data provided for ${filename}`);
    }
    
    // Handle various data URL formats (video/webm, video/mp4, video/x-matroska, etc.)
    let base64Content = base64Data;
    const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1];
      base64Content = dataUrlMatch[2];
      console.log(`   📁 MIME type: ${mimeType}, base64 length: ${base64Content.length}`);
    } else if (base64Data.includes(";base64,")) {
      // Fallback: strip anything before base64,
      base64Content = base64Data.split(";base64,")[1] || base64Data;
      console.log(`   📁 Stripped prefix, base64 length: ${base64Content.length}`);
    }
    
    const buffer = Buffer.from(base64Content, "base64");
    
    if (buffer.length === 0) {
      throw new Error(`Invalid video data: empty buffer for ${filename} (original length: ${base64Data.length})`);
    }
    
    const filePath = path.join(TEMP_DIR, filename);
    await fs.writeFile(filePath, buffer);
    
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error(`Failed to write video file: ${filename} is empty`);
    }
    
    console.log(`   💾 Saved: ${filename} (${Math.round(stats.size / 1024)}KB)`);
    return filePath;
  }

  async getVideoPath(videoId: string): Promise<string> {
    return path.join(VIDEOS_DIR, videoId);
  }

  async videoExists(videoId: string): Promise<boolean> {
    try {
      const videoPath = await this.getVideoPath(videoId);
      await fs.access(videoPath);
      return true;
    } catch {
      return false;
    }
  }
}

export const videoProcessor = new VideoProcessor();

// Normalized clips directory
const NORMALIZED_CLIPS_DIR = path.join(process.cwd(), "uploads", "clips", "normalized");

/**
 * Normalize a raw video clip to MP4 format for consistent playback
 * Uses FFmpeg to convert webm -> mp4 with proper codecs
 */
export async function normalizeClipVideo(inputPath: string): Promise<string> {
  // Ensure output directory exists
  await fs.mkdir(NORMALIZED_CLIPS_DIR, { recursive: true });
  
  const inputFilename = path.basename(inputPath);
  const outputFilename = inputFilename.replace(/\.[^.]+$/, '') + '-normalized.mp4';
  const outputPath = path.join(NORMALIZED_CLIPS_DIR, outputFilename);
  
  console.log(`[normalizeClip] Input: ${inputPath}`);
  console.log(`[normalizeClip] Output: ${outputPath}`);
  
  return new Promise((resolve, reject) => {
    // First try: copy streams (fast, preserves quality)
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',      // Re-encode video to H.264
        '-preset veryfast',   // Fast encoding
        '-crf 23',            // Good quality
        '-c:a aac',           // Audio codec
        '-b:a 128k',          // Audio bitrate
        '-movflags +faststart', // Enable streaming
        '-y',                 // Overwrite output
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`[normalizeClip] FFmpeg command: ${cmd}`);
      })
      .on('stderr', (line) => {
        // Log FFmpeg progress/errors
        if (line.includes('Error') || line.includes('error')) {
          console.error(`[normalizeClip] FFmpeg: ${line}`);
        }
      })
      .on('end', () => {
        console.log(`[normalizeClip] FFmpeg completed successfully`);
        console.log(`[normalizeClip] Output file: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', async (err, stdout, stderr) => {
        console.error(`[normalizeClip] FFmpeg error: ${err.message}`);
        console.error(`[normalizeClip] FFmpeg stderr: ${stderr}`);
        
        // Try fallback: more aggressive re-encoding
        console.log(`[normalizeClip] Trying fallback encoding...`);
        
        ffmpeg(inputPath)
          .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-crf 28',
            '-c:a aac',
            '-b:a 96k',
            '-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
            '-movflags +faststart',
            '-y',
          ])
          .output(outputPath)
          .on('end', () => {
            console.log(`[normalizeClip] Fallback encoding completed`);
            resolve(outputPath);
          })
          .on('error', (fallbackErr, _stdout, fallbackStderr) => {
            console.error(`[normalizeClip] Fallback also failed: ${fallbackErr.message}`);
            console.error(`[normalizeClip] Fallback stderr: ${fallbackStderr}`);
            reject(new Error(`Video normalization failed: ${fallbackErr.message}`));
          })
          .run();
      })
      .run();
  });
}
