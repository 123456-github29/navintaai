/**
 * remotionRenderer.ts
 *
 * Drop-in replacement for ffmpegExport.ts and editExecutor.ts.
 * Uses @remotion/renderer + @remotion/bundler to render professional
 * videos using React-based compositions instead of raw FFmpeg.
 */

import { promises as fs } from "fs";
import { execSync } from "child_process";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const TEMP_DIR = path.join(UPLOADS_DIR, "temp");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");

// Path to the Remotion composition entry point
const REMOTION_ENTRY = path.resolve(process.cwd(), "remotion/src/index.ts");

// Cached bundle location (re-used across renders to avoid re-bundling)
let _bundleCache: string | null = null;
// Single in-flight Promise so concurrent callers share one bundle run
let _bundleInProgress: Promise<string> | null = null;

async function getBundle(): Promise<string> {
  if (_bundleCache) return _bundleCache;
  if (_bundleInProgress) return _bundleInProgress;

  _bundleInProgress = (async () => {
    console.log("[remotion] Bundling composition...");
    const { bundle } = await import("@remotion/bundler");
    const bundled = await bundle({
      entryPoint: REMOTION_ENTRY,
      onProgress: (progress) => {
        if (Math.round(progress) % 20 === 0) {
          console.log(`[remotion] Bundle progress: ${Math.round(progress)}%`);
        }
      },
    });
    console.log(`[remotion] Bundle ready: ${bundled}`);
    _bundleCache = bundled;
    return bundled;
  })().catch((err) => {
    // Reset so the next caller can retry
    _bundleInProgress = null;
    throw err;
  }).finally(() => {
    // Always clear the in-flight marker once settled
    _bundleInProgress = null;
  });

  return _bundleInProgress;
}

// Pre-warm the bundle on first import
getBundle().catch((err) => {
  console.warn("[remotion] Pre-bundle failed (will retry on first render):", err.message);
});

// ----------------------------------------------------------------
//  Types matching the existing ffmpegExport / editExecutor API
// ----------------------------------------------------------------

export interface CaptionSegmentInput {
  start: number;
  end: number;
  originalText?: string;
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

export interface CutSegmentInput {
  id?: string;
  timeStart: number;
  timeEnd: number;
  label?: string;
  enabled?: boolean;
}

export interface ExportOptions {
  inputPath: string;
  cuts: CutSegmentInput[];
  captions: CaptionSegmentInput[];
  fps?: number;
}

export interface EditState {
  cuts?: Array<{ start: number; end: number; label?: string }>;
  speedAdjustments?: Array<{ start: number; end: number; speed: number }>;
  captions?: boolean;
  captionStyle?: "viral" | "boxed" | "cinematic" | "neon" | "gradient" | "highlighted" | "outline" | "default";
  captionPosition?: "bottom" | "top" | "center";
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
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
}

// ----------------------------------------------------------------
//  Caption style mapper (from old style settings to Remotion enum)
// ----------------------------------------------------------------

function mapCaptionStyle(
  style?: CaptionSegmentInput["style"]
): "default" | "boxed" | "gradient" | "highlighted" | "outline" | "cinematic" | "viral" | "neon" {
  if (!style) return "default";
  const bg = style.background?.toLowerCase() || "";
  if (bg.includes("gradient")) return "gradient";
  if (bg.includes("black") || bg.includes("rgba")) return "boxed";
  if (style.outlineColor) return "outline";
  return "default";
}

// ----------------------------------------------------------------
//  Helper: get video duration using ffprobe (cached by path)
// ----------------------------------------------------------------

// Cache duration lookups to avoid spawning ffprobe on every render for the same file
const _durationCache = new Map<string, number>();

type ExecFileAsync = (cmd: string, args: string[]) => Promise<{ stdout: string }>;

// Lazily-imported to avoid requiring child_process at module load time
let _execFileAsync: ExecFileAsync | null = null;
async function getExecFileAsync(): Promise<ExecFileAsync> {
  if (!_execFileAsync) {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    _execFileAsync = promisify(execFile) as unknown as ExecFileAsync;
  }
  return _execFileAsync;
}

async function getVideoDuration(filePath: string): Promise<number> {
  const cached = _durationCache.get(filePath);
  if (cached !== undefined) return cached;

  try {
    const execFileAsync = await getExecFileAsync();
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const duration = parseFloat(stdout.trim()) || 60;
    _durationCache.set(filePath, duration);
    return duration;
  } catch {
    return 60; // fallback
  }
}

// ----------------------------------------------------------------
//  Core render function
// ----------------------------------------------------------------

interface RenderVideoOptions {
  videoSrc: string; // file:// URL or absolute path
  cuts?: Array<{ start: number; end: number; label?: string }>;
  captions?: Array<{
    start: number;
    end: number;
    text: string;
    style?: "default" | "boxed" | "gradient" | "highlighted" | "outline" | "cinematic" | "viral" | "neon";
    position?: "top" | "bottom" | "center";
    baseTextColor?: string;
    outlineColor?: string;
  }>;
  filters?: Array<{
    type: string;
    value?: number;
    startTime?: number;
    endTime?: number;
  }>;
  transitions?: Array<{
    type: "fade" | "dissolve" | "wipe" | "zoom" | "flash" | "glitch";
    timestamp: number;
    duration: number;
  }>;
  brollSegments?: Array<{
    timestamp: number;
    duration: number;
    url?: string;
    query?: string;
    lumaGenerationId?: string;
  }>;
  speedAdjustments?: Array<{ start: number; end: number; speed: number }>;
  vfxAssets?: Array<{
    type: string;
    color?: string;
    secondaryColor?: string;
    intensity?: number;
    timestamp?: number;
    duration?: number;
    speed?: number;
  }>;
  totalDurationInSeconds: number;
  fps?: number;
  outputPath: string;
  gradeLook?: "none" | "cinematic" | "vintage" | "warm" | "cool" | "dramatic" | "matte" | "neon" | "teal_orange";
  showFilmGrain?: boolean;
  showCinematicBars?: boolean;
  lowerThirdTitle?: string;
  lowerThirdSubtitle?: string;
}

// Find the system-installed Chromium (installed via nixpkgs).
// Remotion's bundled chrome-headless-shell won't work in containerised
// environments where its shared library dependencies aren't present.
function findSystemChromium(): string | undefined {
  const candidates = [
    process.env.REMOTION_CHROME_EXECUTABLE,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_EXECUTABLE,
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  for (const name of ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome"]) {
    try {
      const p = execSync(`which ${name}`, { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
      if (p) return p;
    } catch { /* not found */ }
  }
  return undefined;
}

const _systemChromium = findSystemChromium();
if (_systemChromium) {
  console.log(`[remotion] Using system chromium: ${_systemChromium}`);
} else {
  console.warn("[remotion] No system chromium found — Remotion will try its bundled binary (may fail in containers)");
}

async function renderVideo(opts: RenderVideoOptions): Promise<void> {
  const {
    renderMedia,
    selectComposition,
    makeCancelSignal,
  } = await import("@remotion/renderer");

  const bundleLocation = await getBundle();

  const fps = opts.fps ?? 30;
  const totalFrames = Math.round(opts.totalDurationInSeconds * fps);

  // Build input props matching the VideoEditorComposition schema
  const inputProps = {
    videoSrc: opts.videoSrc.startsWith("file://")
      ? opts.videoSrc
      : `file://${opts.videoSrc}`,
    cuts: opts.cuts ?? [],
    captions: opts.captions ?? [],
    filters: opts.filters ?? [],
    transitions: opts.transitions ?? [],
    brollSegments: opts.brollSegments ?? [],
    vfxAssets: opts.vfxAssets ?? [],
    speedAdjustments: opts.speedAdjustments ?? [],
    totalDurationInSeconds: opts.totalDurationInSeconds,
    gradeLook: opts.gradeLook ?? "none",
    showFilmGrain: opts.showFilmGrain ?? false,
    showCinematicBars: opts.showCinematicBars ?? false,
    lowerThirdTitle: opts.lowerThirdTitle,
    lowerThirdSubtitle: opts.lowerThirdSubtitle,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "VideoEditor",
    inputProps,
    browserExecutable: _systemChromium,
    chromiumOptions: {
      disableWebSecurity: true,
      ignoreCertificateErrors: true,
      gl: "swangle",
    },
  });

  // Override duration to match actual video
  composition.durationInFrames = Math.max(1, totalFrames);
  composition.fps = fps;
  composition.width = 1080;
  composition.height = 1920;

  const { cancelSignal } = makeCancelSignal();

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: opts.outputPath,
    inputProps,
    browserExecutable: _systemChromium,
    chromiumOptions: {
      disableWebSecurity: true,
      ignoreCertificateErrors: true,
      gl: "swangle",
    },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 20 === 0) {
        console.log(`[remotion] Render progress: ${pct}%`);
      }
    },
    cancelSignal,
    verbose: false,
    enforceAudioTrack: true,
    muted: false,
    imageFormat: "jpeg",
    jpegQuality: 90,
    crf: 23,
    pixelFormat: "yuv420p",
    x264Preset: "veryfast",
  });
}

// ----------------------------------------------------------------
//  Public API - replaces ffmpegExport.exportWithEdits
// ----------------------------------------------------------------

export async function exportWithEdits(options: ExportOptions): Promise<string> {
  const { inputPath, cuts, captions, fps = 30 } = options;

  await fs.mkdir(TEMP_DIR, { recursive: true });
  await fs.mkdir(VIDEOS_DIR, { recursive: true });

  const jobId = randomUUID();
  const outputFilename = `video-${jobId}.mp4`;
  const outputPath = path.join(VIDEOS_DIR, outputFilename);

  // Get video duration
  const totalDurationInSeconds = await getVideoDuration(inputPath);

  // Map cuts
  const enabledCuts = (cuts || [])
    .filter((c) => c.enabled !== false && c.timeEnd > c.timeStart && c.timeStart >= 0)
    .sort((a, b) => a.timeStart - b.timeStart)
    .map((c) => ({ start: c.timeStart, end: c.timeEnd, label: c.label }));

  // Map captions to Remotion format
  const remotionCaptions = (captions || [])
    .filter((c) => c.end > c.start)
    .map((c) => {
      const text = c.useViral && c.viralText ? c.viralText : c.originalText || "";
      const style = mapCaptionStyle(c.style);
      const position = (c.style?.position as "top" | "bottom" | "center") || "bottom";
      return {
        start: c.start,
        end: c.end,
        text,
        style,
        position,
        baseTextColor: c.style?.baseTextColor,
        outlineColor: c.style?.outlineColor,
      };
    })
    .filter((c) => c.text.trim().length > 0);

  // Infer grade look from captions/context - default to cinematic for professional look
  const gradeLook = captions.length > 0 ? ("cinematic" as const) : ("none" as const);

  console.log(
    `[remotion] exportWithEdits: ${enabledCuts.length} cuts, ${remotionCaptions.length} captions`
  );

  await renderVideo({
    videoSrc: inputPath,
    cuts: enabledCuts,
    captions: remotionCaptions,
    filters: [],
    transitions: [],
    brollSegments: [],
    speedAdjustments: [],
    totalDurationInSeconds,
    fps,
    outputPath,
    gradeLook,
    showFilmGrain: true,
    showCinematicBars: false,
  });

  console.log(`[remotion] exportWithEdits complete: ${outputFilename}`);
  return outputFilename;
}

// ----------------------------------------------------------------
//  Public API - replaces editExecutor.executeEdits
// ----------------------------------------------------------------

/**
 * Converts "sections to remove" into "sections to keep".
 * The AI generates cuts as intervals to REMOVE from the video.
 * The Remotion composition expects cuts as intervals to KEEP (play).
 */
function invertCuts(
  cutsToRemove: Array<{ start: number; end: number }>,
  totalDuration: number
): Array<{ start: number; end: number }> {
  if (cutsToRemove.length === 0) return [];

  const sorted = [...cutsToRemove]
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start);

  const kept: Array<{ start: number; end: number }> = [];
  let cursor = 0;

  for (const cut of sorted) {
    const start = Math.max(0, cut.start);
    const end = Math.min(totalDuration, cut.end);
    if (start >= end) continue;

    if (start > cursor) {
      kept.push({ start: cursor, end: start });
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < totalDuration) {
    kept.push({ start: cursor, end: totalDuration });
  }

  return kept;
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

  // Map cuts: AI stores "sections to remove", Remotion needs "sections to keep"
  const rawCuts = (editState.cuts || [])
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start);
  const cuts = rawCuts.length > 0 ? invertCuts(rawCuts, videoDuration) : [];

  // Map filters with params flattening
  const filters = (editState.filters || []).map((f) => ({
    type: f.type,
    value: f.params?.value ?? 1.0,
    startTime: f.startTime,
    endTime: f.endTime,
  }));

  // Detect grade look from filter types
  let gradeLook: RenderVideoOptions["gradeLook"] = "cinematic"; // default professional look
  for (const f of filters) {
    if (f.type === "vintage") { gradeLook = "vintage"; break; }
    if (f.type === "warm") { gradeLook = "warm"; break; }
    if (f.type === "cool") { gradeLook = "cool"; break; }
    if (f.type === "cinematic") { gradeLook = "cinematic"; break; }
    if (f.type === "dramatic") { gradeLook = "dramatic"; break; }
  }

  // Map transitions with validated types
  const validTransitionTypes = ["fade", "dissolve", "wipe", "zoom", "flash", "glitch"] as const;
  type ValidTransition = typeof validTransitionTypes[number];

  const transitions = (editState.transitions || [])
    .filter((t) => validTransitionTypes.includes(t.type as ValidTransition))
    .map((t) => ({
      type: t.type as ValidTransition,
      timestamp: t.timestamp,
      duration: t.duration,
    }));

  // Map b-roll (only segments that have a URL ready)
  const brollSegments = (editState.brollSegments || [])
    .filter((s) => s.url)
    .map((s) => ({
      timestamp: s.timestamp,
      duration: s.duration,
      url: s.url,
      query: s.query,
      lumaGenerationId: s.lumaGenerationId,
    }));

  const hasComplexFilters = filters.some((f) =>
    ["blur", "sharpen"].includes(f.type)
  );

  // Map transcript segments → Remotion captions when captions flag is set
  const captionStyle = editState.captionStyle ?? "viral";
  const captionPosition = editState.captionPosition ?? "bottom";
  const captions =
    editState.captions && editState.transcriptSegments?.length
      ? editState.transcriptSegments
          .filter((s) => s.end > s.start)
          .map((s) => ({
            start: s.start,
            end: s.end,
            text: s.text,
            style: captionStyle,
            position: captionPosition,
          }))
      : [];

  // Map VFX assets with validated types
  const validVfxTypes = [
    "light_leak", "bokeh", "color_wash", "particles", "lens_flare",
    "chromatic_aberration", "smoke", "prism", "duotone", "glow_pulse",
  ] as const;

  const vfxAssets = (editState.vfxAssets || [])
    .filter((v) => validVfxTypes.includes(v.type as typeof validVfxTypes[number]))
    .map((v) => ({
      type: v.type,
      color: v.color,
      secondaryColor: v.secondaryColor,
      intensity: v.intensity,
      timestamp: v.timestamp,
      duration: v.duration,
      speed: v.speed,
    }));

  console.log(
    `[remotion] executeEdits: ${cuts.length} cuts, ${filters.length} filters, ${transitions.length} transitions, ${brollSegments.length} b-roll, ${vfxAssets.length} vfx, ${captions.length} captions`
  );

  await renderVideo({
    videoSrc: inputFile,
    cuts,
    captions,
    filters,
    transitions,
    brollSegments,
    vfxAssets,
    speedAdjustments: editState.speedAdjustments || [],
    totalDurationInSeconds: videoDuration,
    fps: 30,
    outputPath,
    gradeLook,
    showFilmGrain: true,
    showCinematicBars: false,
  });

  console.log(`[remotion] executeEdits complete: ${outputFilename}`);
  return outputFilename;
}
