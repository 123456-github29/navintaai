import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const TEMP_DIR = path.join(UPLOADS_DIR, "temp");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");

interface CaptionSegment {
  start: number;
  end: number;
  originalText: string;
  viralText?: string;
  useViral?: boolean;
  style?: {
    font?: string;
    baseTextColor?: string;
    outlineColor?: string;
    background?: string;
    position?: string;
  };
}

interface CutSegment {
  id: string;
  timeStart: number;
  timeEnd: number;
  label?: string;
  enabled?: boolean;
}

interface ExportOptions {
  inputPath: string;
  cuts: CutSegment[];
  captions: CaptionSegment[];
  fps?: number;
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\\\:")
    .replace(/%/g, "\\\\%")
    .replace(/\[/g, "\\\\[")
    .replace(/\]/g, "\\\\]")
    .replace(/;/g, "\\\\;");
}

function buildCaptionFilters(captions: CaptionSegment[]): string[] {
  if (!captions || captions.length === 0) return [];

  const filters: string[] = [];

  for (const cap of captions) {
    if (cap.end <= cap.start) continue;
    const rawText = cap.useViral && cap.viralText ? cap.viralText : cap.originalText;
    if (!rawText || rawText.trim().length === 0) continue;
    const text = escapeDrawtext(rawText);
    const color = cap.style?.baseTextColor || "white";
    const borderColor = cap.style?.outlineColor || "black";
    const yPos = cap.style?.position === "top" ? "h*0.1" : "h*0.82";

    filters.push(
      `drawtext=text='${text}':font=DejaVu Sans:fontsize=38:fontcolor=${color}:borderw=3:bordercolor=${borderColor}:x=(w-text_w)/2:y=${yPos}:enable='between(t,${cap.start.toFixed(3)},${cap.end.toFixed(3)})'`
    );
  }

  return filters;
}

export async function exportWithEdits(options: ExportOptions): Promise<string> {
  const { inputPath, cuts, captions, fps = 30 } = options;

  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(VIDEOS_DIR, { recursive: true });

  const jobId = randomUUID();
  const outputFilename = `video-${jobId}.mp4`;
  const outputPath = path.join(VIDEOS_DIR, outputFilename);
  const tempFiles: string[] = [];

  try {
    const enabledCuts = cuts
      .filter(c => c.enabled !== false && c.timeEnd > c.timeStart && c.timeStart >= 0)
      .sort((a, b) => a.timeStart - b.timeStart);

    let processInputPath = inputPath;

    if (enabledCuts.length > 0) {
      const trimmedPaths: string[] = [];

      for (let i = 0; i < enabledCuts.length; i++) {
        const cut = enabledCuts[i];
        const trimmedPath = path.join(TEMP_DIR, `cut-${jobId}-${i}.mp4`);
        tempFiles.push(trimmedPath);

        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .setStartTime(cut.timeStart)
            .setDuration(cut.timeEnd - cut.timeStart)
            .outputOptions([
              "-c:v libx264",
              "-c:a aac",
              "-preset ultrafast",
              "-crf 23",
              "-movflags +faststart",
            ])
            .output(trimmedPath)
            .on("end", () => resolve())
            .on("error", (err) => reject(err))
            .run();
        });

        trimmedPaths.push(trimmedPath);
      }

      if (trimmedPaths.length === 1) {
        processInputPath = trimmedPaths[0];
      } else {
        const concatFile = path.join(TEMP_DIR, `concat-${jobId}.txt`);
        tempFiles.push(concatFile);
        const concatContent = trimmedPaths.map(p => `file '${p}'`).join("\n");
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
            .on("error", (err) => reject(err))
            .run();
        });

        processInputPath = mergedPath;
      }
    }

    const captionFilters = buildCaptionFilters(captions);
    const baseFilters = [
      "scale=1080:1920:force_original_aspect_ratio=decrease",
      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
    ];
    const allFilters = [...baseFilters, ...captionFilters];

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(processInputPath)
        .videoFilters(allFilters)
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
          console.log(`[ffmpegExport] FFmpeg: ${cmdStr.substring(0, 150)}...`);
        })
        .on("progress", (progress) => {
          if (progress.percent && Math.round(progress.percent) % 20 === 0) {
            console.log(`[ffmpegExport] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", () => {
          console.log(`[ffmpegExport] Render complete: ${outputFilename}`);
          resolve();
        })
        .on("error", (err) => {
          console.error(`[ffmpegExport] FFmpeg error: ${err.message}`);
          reject(err);
        });

      cmd.run();
    });

    return outputFilename;
  } finally {
    for (const f of tempFiles) {
      await fs.unlink(f).catch(() => {});
    }
  }
}
