import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { downloadVideoToTemp } from "./supabaseStorage";
import { checkLumaStatus } from "./aiEditor";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const TEMP_DIR = path.join(UPLOADS_DIR, "temp");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");

export interface EditState {
  cuts?: Array<{ start: number; end: number; label?: string }>;
  speedAdjustments?: Array<{ start: number; end: number; speed: number }>;
  captions?: boolean;
  musicStyle?: string;
  filters?: Array<{
    type: string;
    params?: { value?: number };
    startTime?: number;
    endTime?: number;
  }>;
  transitions?: Array<{ type: string; timestamp: number; duration: number }>;
  brollSegments?: Array<{
    timestamp: number;
    duration: number;
    query?: string;
    lumaGenerationId?: string;
    url?: string;
  }>;
  vfxAssets?: Array<{
    type: string;
    color?: string;
    secondaryColor?: string;
    intensity?: number;
    timestamp?: number;
    duration?: number;
    speed?: number;
  }>;
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/;/g, "\\;");
}

function buildFilterGraph(
  editState: EditState,
  videoDuration: number,
  hasAudio: boolean
): { videoFilters: string[]; audioFilters: string[] } {
  const videoFilters: string[] = [];
  const audioFilters: string[] = [];

  // Base scaling for vertical format (9:16)
  videoFilters.push("scale=1080:1920:force_original_aspect_ratio=decrease");
  videoFilters.push("pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black");

  // Apply filters
  if (editState.filters && editState.filters.length > 0) {
    for (const filter of editState.filters) {
      const value = filter.params?.value ?? 1.0;
      let filterStr = "";

      switch (filter.type) {
        case "brightness":
          filterStr = `brightness=${value}`;
          break;
        case "contrast":
          filterStr = `contrast=${value}`;
          break;
        case "saturation":
          filterStr = `saturation=${value}`;
          break;
        case "blur":
          filterStr = `boxblur=${Math.max(1, Math.round(value * 5))}`;
          break;
        case "sharpen":
          filterStr = `unsharp=5:5:${value}`;
          break;
        case "vintage":
          filterStr = `colorspace=bt709:ispace=bt709,colorlevels=rimin=0.039:gimin=0.039:bimin=0.039`;
          break;
        case "cinematic":
          filterStr = `curves=all='0/0 0.5/0.4 1/1',colorspace=bt709`;
          break;
        case "warm":
          filterStr = `colortemperature=${2500 + value * 2000}`;
          break;
        case "cool":
          filterStr = `colortemperature=${4000 - value * 1000}`;
          break;
      }

      if (filterStr) {
        const startTime = filter.startTime ?? 0;
        const endTime = filter.endTime ?? videoDuration;
        filterStr += `:enable='between(t,${startTime},${endTime})'`;
        videoFilters.push(filterStr);
      }
    }
  }

  // Burn captions from transcript segments
  if (editState.captions && editState.transcriptSegments && editState.transcriptSegments.length > 0) {
    const segments = editState.transcriptSegments.slice(0, 60); // cap to avoid extremely long filter chains
    for (const seg of segments) {
      const rawText = (seg.text || "").trim();
      if (!rawText) continue;
      const escapedText = escapeDrawtext(rawText);
      videoFilters.push(
        `drawtext=text='${escapedText}':x=(w-text_w)/2:y=h-th-120:enable='between(t,${seg.start},${seg.end})':fontsize=42:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8:line_spacing=4`
      );
    }
  }

  // Add transitions (implemented as fade-like effects)
  if (editState.transitions && editState.transitions.length > 0) {
    for (const transition of editState.transitions) {
      const transStart = transition.timestamp;
      const transEnd = transStart + transition.duration;

      switch (transition.type) {
        case "fade":
          videoFilters.push(
            `fade=t=in:st=${transStart}:d=${transition.duration}:color=black`
          );
          videoFilters.push(
            `fade=t=out:st=${transEnd}:d=${transition.duration}:color=black`
          );
          break;
        case "dissolve":
        case "wipe":
        case "zoom":
          // Simplified: use fade effect for all transitions
          videoFilters.push(
            `fade=t=in:st=${transStart}:d=${transition.duration}:color=black`
          );
          break;
      }
    }
  }

  // Apply VFX-based color adjustments (FFmpeg approximations for VFX overlay effects)
  if (editState.vfxAssets && editState.vfxAssets.length > 0) {
    for (const vfx of editState.vfxAssets) {
      const startTime = vfx.timestamp ?? 0;
      const endTime = (vfx.timestamp ?? 0) + (vfx.duration ?? videoDuration);
      const intensity = vfx.intensity ?? 0.5;
      let filterStr = "";

      switch (vfx.type) {
        case "color_wash":
        case "duotone":
          filterStr = `colorbalance=rs=${intensity * 0.3}:gs=${intensity * 0.1}:bs=${intensity * 0.2}`;
          break;
        case "light_leak":
          filterStr = `curves=all='0/0 0.25/${0.25 + intensity * 0.1} 0.5/${0.5 + intensity * 0.05} 1/1'`;
          break;
        case "chromatic_aberration":
          // Slight color shift approximation
          filterStr = `colorbalance=rh=${intensity * 0.15}:bh=${-intensity * 0.15}`;
          break;
        case "smoke":
          filterStr = `curves=all='0/${intensity * 0.15} 0.5/0.5 1/1'`;
          break;
        case "glow_pulse":
          filterStr = `gblur=sigma=${intensity * 2}:enable='between(t,${startTime},${endTime})',colorlevels=rimax=${1 + intensity * 0.1}:gimax=${1 + intensity * 0.1}:bimax=${1 + intensity * 0.1}`;
          videoFilters.push(filterStr);
          continue; // skip the enable append below since it's already handled
        default:
          continue;
      }

      if (filterStr) {
        filterStr += `:enable='between(t,${startTime},${endTime})'`;
        videoFilters.push(filterStr);
      }
    }
  }

  return { videoFilters, audioFilters };
}

async function buildConcatDemuxer(
  inputFile: string,
  editState: EditState,
  jobId: string,
  tempFiles: string[]
): Promise<string> {
  // If we have cuts, we need to build segments
  if (!editState.cuts || editState.cuts.length === 0) {
    return inputFile;
  }

  // Create trimmed segments
  const trimmedPaths: string[] = [];
  const sortedCuts = editState.cuts.sort((a, b) => a.start - b.start);

  for (let i = 0; i < sortedCuts.length; i++) {
    const cut = sortedCuts[i];
    if (cut.end <= cut.start) continue;

    const segmentPath = path.join(TEMP_DIR, `segment-${jobId}-${i}.mp4`);
    tempFiles.push(segmentPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFile)
        .setStartTime(cut.start)
        .setDuration(cut.end - cut.start)
        .outputOptions([
          "-c:v libx264",
          "-c:a aac",
          "-preset ultrafast",
          "-crf 23",
          "-movflags +faststart",
        ])
        .output(segmentPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    trimmedPaths.push(segmentPath);
  }

  if (trimmedPaths.length === 0) return inputFile;
  if (trimmedPaths.length === 1) return trimmedPaths[0];

  // Concatenate segments
  const concatFile = path.join(TEMP_DIR, `concat-${jobId}.txt`);
  tempFiles.push(concatFile);
  const concatContent = trimmedPaths.map((p) => `file '${p}'`).join("\n");
  await fs.writeFile(concatFile, concatContent);

  const mergedPath = path.join(TEMP_DIR, `merged-${jobId}.mp4`);
  tempFiles.push(mergedPath);

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
      .output(mergedPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  return mergedPath;
}

async function downloadBrollVideo(
  url: string,
  jobId: string,
  index: number,
  tempFiles: string[]
): Promise<string> {
  const brollPath = path.join(TEMP_DIR, `broll-${jobId}-${index}.mp4`);
  tempFiles.push(brollPath);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download B-roll from ${url}`);

  const buffer = await response.arrayBuffer();
  await fs.writeFile(brollPath, Buffer.from(buffer));
  return brollPath;
}

async function insertBroll(
  inputFile: string,
  editState: EditState,
  jobId: string,
  tempFiles: string[]
): Promise<string> {
  if (!editState.brollSegments || editState.brollSegments.length === 0) {
    return inputFile;
  }

  let currentInput = inputFile;

  for (let i = 0; i < editState.brollSegments.length; i++) {
    const segment = editState.brollSegments[i];
    if (!segment.url) continue;

    const brollPath = await downloadBrollVideo(segment.url, jobId, i, tempFiles);
    const outputPath = path.join(TEMP_DIR, `with-broll-${jobId}-${i}.mp4`);
    tempFiles.push(outputPath);

    // Overlay B-roll at specified timestamp
    const startTime = segment.timestamp;
    const duration = segment.duration;

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(currentInput)
        .input(brollPath)
        .complexFilter([
          `[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[broll];[0:v][broll]xfade=transition=fade:duration=${duration}:offset=${startTime}[v]`,
          `[0:a][1:a]concat=n=2:v=0:a=1[a]`,
        ])
        .map("[v]")
        .map("[a]")
        .outputOptions([
          "-c:v libx264",
          "-c:a aac",
          "-preset ultrafast",
          "-crf 23",
          "-movflags +faststart",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    currentInput = outputPath;
  }

  return currentInput;
}

async function applySpeedAdjustments(
  inputFile: string,
  editState: EditState,
  jobId: string,
  tempFiles: string[]
): Promise<string> {
  if (!editState.speedAdjustments || editState.speedAdjustments.length === 0) {
    return inputFile;
  }

  let currentInput = inputFile;

  for (let i = 0; i < editState.speedAdjustments.length; i++) {
    const adjustment = editState.speedAdjustments[i];
    const outputPath = path.join(TEMP_DIR, `speed-${jobId}-${i}.mp4`);
    tempFiles.push(outputPath);

    const duration = adjustment.end - adjustment.start;
    const speedFactor = adjustment.speed;

    // Apply setpts filter for speed change
    const vf = `setpts=PTS/${speedFactor}`;
    const af = `atempo=${speedFactor}`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(currentInput)
        .setStartTime(adjustment.start)
        .setDuration(duration)
        .videoFilter(vf)
        .audioFilter(af)
        .outputOptions([
          "-c:v libx264",
          "-c:a aac",
          "-preset ultrafast",
          "-crf 23",
          "-movflags +faststart",
        ])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    currentInput = outputPath;
  }

  return currentInput;
}

export async function executeEdits(
  inputFile: string,
  editState: EditState,
  videoDuration: number
): Promise<string> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(VIDEOS_DIR, { recursive: true });

  const jobId = randomUUID();
  const outputFilename = `edited-${jobId}.mp4`;
  const outputPath = path.join(VIDEOS_DIR, outputFilename);
  const tempFiles: string[] = [];

  try {
    // Step 1: Apply cuts/trimming
    let processInput = await buildConcatDemuxer(
      inputFile,
      editState,
      jobId,
      tempFiles
    );

    // Step 2: Apply speed adjustments
    if (editState.speedAdjustments && editState.speedAdjustments.length > 0) {
      processInput = await applySpeedAdjustments(
        processInput,
        editState,
        jobId,
        tempFiles
      );
    }

    // Step 3: Insert B-roll
    if (editState.brollSegments && editState.brollSegments.length > 0) {
      // First, check if any Luma generations are still pending
      for (const segment of editState.brollSegments) {
        if (segment.lumaGenerationId && !segment.url) {
          const lumaStatus = await checkLumaStatus(segment.lumaGenerationId);
          if (lumaStatus.status === "completed" && lumaStatus.videoUrl) {
            segment.url = lumaStatus.videoUrl;
          }
        }
      }
      processInput = await insertBroll(
        processInput,
        editState,
        jobId,
        tempFiles
      );
    }

    // Step 4: Apply filters, transitions, and other effects
    const { videoFilters, audioFilters } = buildFilterGraph(
      editState,
      videoDuration,
      true
    );

    // Music disabled for now
    const musicInput = processInput;

    // Step 6: Final render with all filters
    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(musicInput);

      if (videoFilters.length > 0) {
        cmd.videoFilters(videoFilters);
      }
      if (audioFilters.length > 0) {
        cmd.audioFilters(audioFilters);
      }

      cmd
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 23",
          "-c:a aac",
          "-b:a 128k",
          "-movflags +faststart",
        ])
        .output(outputPath)
        .on("start", (cmdStr) => {
          console.log(`[editExecutor] FFmpeg: ${cmdStr.substring(0, 150)}...`);
        })
        .on("progress", (progress) => {
          if (progress.percent && Math.round(progress.percent) % 20 === 0) {
            console.log(
              `[editExecutor] Progress: ${Math.round(progress.percent)}%`
            );
          }
        })
        .on("end", () => {
          console.log(`[editExecutor] Render complete: ${outputFilename}`);
          resolve();
        })
        .on("error", reject)
        .run();
    });

    return outputFilename;
  } finally {
    // Cleanup temp files
    for (const f of tempFiles) {
      await fs.unlink(f).catch(() => {});
    }
  }
}
