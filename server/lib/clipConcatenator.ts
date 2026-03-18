/**
 * clipConcatenator.ts
 *
 * Concatenates multiple video clips into a single video file using FFmpeg.
 * Used for multi-shot transcription, export, and preview.
 */

import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Concatenates multiple video clips into a single MP4 file.
 * Uses ffmpeg concat demuxer for seamless stitching.
 *
 * @param clipPaths  Array of absolute paths to clip files (in order)
 * @param tempDir    Directory for temporary files
 * @returns          Absolute path to the concatenated output file
 */
export async function concatenateClips(
  clipPaths: string[],
  tempDir: string
): Promise<string> {
  if (clipPaths.length === 0) {
    throw new Error("No clips to concatenate");
  }

  // Single clip — no concatenation needed, just return a copy
  if (clipPaths.length === 1) {
    return clipPaths[0];
  }

  await fs.mkdir(tempDir, { recursive: true });

  const jobId = randomUUID();
  const tempFiles: string[] = [];

  try {
    // Step 1: Re-encode each clip to ensure uniform codec/resolution/framerate
    // This prevents concat failures from mismatched formats (e.g. webm vs mp4)
    const normalizedPaths: string[] = [];

    for (let i = 0; i < clipPaths.length; i++) {
      const normalizedPath = path.join(tempDir, `norm-${jobId}-${i}.mp4`);
      tempFiles.push(normalizedPath);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(clipPaths[i])
          .outputOptions([
            "-c:v libx264",
            "-c:a aac",
            "-ar 44100",        // uniform audio sample rate
            "-ac 2",            // stereo
            "-r 30",            // uniform framerate
            "-preset ultrafast",
            "-crf 23",
            "-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-movflags +faststart",
          ])
          .output(normalizedPath)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });

      normalizedPaths.push(normalizedPath);
    }

    // Step 2: Create concat list file
    const concatFile = path.join(tempDir, `concat-${jobId}.txt`);
    tempFiles.push(concatFile);
    const concatContent = normalizedPaths
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await fs.writeFile(concatFile, concatContent);

    // Step 3: Concatenate using concat demuxer
    const outputPath = path.join(tempDir, `combined-${jobId}.mp4`);
    // Note: outputPath is NOT added to tempFiles — caller is responsible for cleanup

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",
          "-c:a aac",
          "-preset ultrafast",
          "-crf 23",
          "-movflags +faststart",
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          console.log(`[clipConcatenator] FFmpeg: ${cmd.substring(0, 200)}...`);
        })
        .on("end", () => {
          console.log(
            `[clipConcatenator] Concatenated ${clipPaths.length} clips into ${path.basename(outputPath)}`
          );
          resolve();
        })
        .on("error", (err) => {
          console.error(`[clipConcatenator] FFmpeg error: ${err.message}`);
          reject(err);
        })
        .run();
    });

    return outputPath;
  } finally {
    // Clean up intermediate normalized files and concat list
    for (const f of tempFiles) {
      await fs.unlink(f).catch(() => {});
    }
  }
}

/**
 * Gets the duration of a video file using ffprobe.
 */
export async function getClipDuration(filePath: string): Promise<number> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}
