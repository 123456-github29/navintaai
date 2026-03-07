import path from "path";
import fs from "fs";
import os from "os";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { EditDecision } from "../schemas/editDecision.schema";
import type { EDL } from "../remotion/types/edl";

let bundleLocation: string | null = null;

async function getBundleLocation(): Promise<string> {
  if (bundleLocation) return bundleLocation;

  const entryPoint = path.resolve(process.cwd(), "src/remotion/Root.tsx");

  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Remotion entry point not found: ${entryPoint}`);
  }

  console.log("[RendererService] Bundling Remotion entry point...");
  const startTime = Date.now();

  bundleLocation = await bundle({
    entryPoint,
    onProgress: (progress: number) => {
      if (progress % 25 === 0) {
        console.log(`[RendererService] Bundle progress: ${progress}%`);
      }
    },
  });

  console.log(`[RendererService] Bundle complete in ${Date.now() - startTime}ms`);
  return bundleLocation;
}

function getChromiumPath(): string {
  const { execSync } = require("child_process");

  const whichResult = execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null || true").toString().trim();
  if (whichResult && fs.existsSync(whichResult)) return whichResult;

  const knownPaths = [
    "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of knownPaths) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error("Chromium not found. Install chromium via nix packages.");
}

export class RendererService {
  static async render(edl: EditDecision): Promise<{ filePath: string; cleanup: () => void }> {
    const bundleLoc = await getBundleLocation();
    const chromiumPath = getChromiumPath();

    const outputDir = path.join(os.tmpdir(), `navinta-render-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "output.mp4");

    console.log("[RendererService] Selecting composition...");

    const composition = await selectComposition({
      serveUrl: bundleLoc,
      id: "PremiumVideo",
      inputProps: edl,
      browserExecutable: chromiumPath,
    });

    const compositionWithOverrides = {
      ...composition,
      width: edl.width,
      height: edl.height,
      fps: edl.fps,
      durationInFrames: edl.durationInFrames,
    };

    console.log(`[RendererService] Rendering ${edl.durationInFrames} frames at ${edl.fps}fps (${edl.width}x${edl.height})...`);
    const startTime = Date.now();

    await renderMedia({
      composition: compositionWithOverrides,
      serveUrl: bundleLoc,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: edl,
      browserExecutable: chromiumPath,
      concurrency: 2,
      pixelFormat: "yuv420p",
      crf: 18,
      audioBitrate: "192k",
      x264Preset: "medium",
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 20 === 0) {
          console.log(`[RendererService] Render progress: ${pct}%`);
        }
      },
    });

    console.log(`[RendererService] Render complete in ${Date.now() - startTime}ms`);

    return {
      filePath: outputPath,
      cleanup: () => {
        try {
          fs.rmSync(outputDir, { recursive: true, force: true });
        } catch (e) {
          console.warn("[RendererService] Failed to cleanup temp dir:", e);
        }
      },
    };
  }

  static async renderSmartEdit(
    edl: EDL,
    options: { width?: number; height?: number } = {}
  ): Promise<{ filePath: string; cleanup: () => void }> {
    const bundleLoc = await getBundleLocation();
    const chromiumPath = getChromiumPath();

    const outputDir = path.join(os.tmpdir(), `navinta-smart-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "output.mp4");

    const TRANSITION_OVERLAP = 4;
    const totalFrames = edl.clips.reduce((sum, clip) => sum + clip.durationInFrames, 0);
    const transitionCount = Math.max(0, edl.clips.length - 1);
    const durationInFrames = Math.max(1, totalFrames - transitionCount * TRANSITION_OVERLAP);
    const width = options.width || 1080;
    const height = options.height || 1920;

    console.log(`[RendererService] Selecting NavintaPremium composition...`);

    const composition = await selectComposition({
      serveUrl: bundleLoc,
      id: "NavintaPremium",
      inputProps: { edl },
      browserExecutable: chromiumPath,
    });

    const compositionWithOverrides = {
      ...composition,
      width,
      height,
      fps: edl.fps,
      durationInFrames,
    };

    console.log(`[RendererService] Smart render: ${durationInFrames} frames at ${edl.fps}fps (${width}x${height}), ${edl.clips.length} clips`);
    const startTime = Date.now();

    await renderMedia({
      composition: compositionWithOverrides,
      serveUrl: bundleLoc,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: { edl },
      browserExecutable: chromiumPath,
      concurrency: 2,
      pixelFormat: "yuv420p",
      crf: 18,
      audioBitrate: "192k",
      x264Preset: "medium",
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 20 === 0) {
          console.log(`[RendererService] Smart render progress: ${pct}%`);
        }
      },
    });

    console.log(`[RendererService] Smart render complete in ${Date.now() - startTime}ms`);

    return {
      filePath: outputPath,
      cleanup: () => {
        try {
          fs.rmSync(outputDir, { recursive: true, force: true });
        } catch (e) {
          console.warn("[RendererService] Failed to cleanup temp dir:", e);
        }
      },
    };
  }

  static async renderTikTokStyle(
    edl: EDL,
    options: { width?: number; height?: number; accentColor?: string; captionFontSize?: number } = {}
  ): Promise<{ filePath: string; cleanup: () => void }> {
    const bundleLoc = await getBundleLocation();
    const chromiumPath = getChromiumPath();

    const outputDir = path.join(os.tmpdir(), `navinta-tiktok-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "output.mp4");

    const TRANSITION_OVERLAP = 6;
    const totalFrames = edl.clips.reduce((sum, clip) => sum + clip.durationInFrames, 0);
    const transitionCount = Math.max(0, edl.clips.length - 1);
    const durationInFrames = Math.max(1, totalFrames - transitionCount * TRANSITION_OVERLAP);
    const width = options.width || 1080;
    const height = options.height || 1920;

    console.log(`[RendererService] Selecting TikTokStyle composition...`);

    const inputProps = {
      edl,
      watermark: true,
      accentColor: options.accentColor || "#FBBF24",
      captionFontSize: options.captionFontSize || 72,
    };

    const composition = await selectComposition({
      serveUrl: bundleLoc,
      id: "TikTokStyle",
      inputProps,
      browserExecutable: chromiumPath,
    });

    const compositionWithOverrides = {
      ...composition,
      width,
      height,
      fps: edl.fps,
      durationInFrames,
    };

    console.log(`[RendererService] TikTok render: ${durationInFrames} frames at ${edl.fps}fps (${width}x${height}), ${edl.clips.length} clips`);
    const startTime = Date.now();

    await renderMedia({
      composition: compositionWithOverrides,
      serveUrl: bundleLoc,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      browserExecutable: chromiumPath,
      concurrency: 2,
      pixelFormat: "yuv420p",
      crf: 18,
      audioBitrate: "192k",
      x264Preset: "medium",
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 20 === 0) {
          console.log(`[RendererService] TikTok render progress: ${pct}%`);
        }
      },
    });

    console.log(`[RendererService] TikTok render complete in ${Date.now() - startTime}ms`);

    return {
      filePath: outputPath,
      cleanup: () => {
        try {
          fs.rmSync(outputDir, { recursive: true, force: true });
        } catch (e) {
          console.warn("[RendererService] Failed to cleanup temp dir:", e);
        }
      },
    };
  }

  static async invalidateBundle(): Promise<void> {
    bundleLocation = null;
    console.log("[RendererService] Bundle cache invalidated");
  }
}
