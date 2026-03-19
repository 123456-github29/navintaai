/**
 * Dedicated Luma AI client — mirrors the OpenAI client pattern.
 * Handles key loading from config, retries with backoff, and structured error handling.
 */

import { config } from "../config";
import { logApiCall } from "./apiLogger";
import { retryWithBackoff } from "./geminiRetry";

const LUMA_BASE_URL = "https://api.lumalabs.ai/dream-machine/v1";

export interface LumaGenerationResult {
  id: string;
  status: string;
  videoUrl?: string;
  error?: string;
}

function getLumaKey(): string {
  return config.ai.lumaApiKey || "";
}

function isLumaEnabled(): boolean {
  return !!getLumaKey() && !config.ai.disabled;
}

async function lumaFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const key = getLumaKey();
  const url = `${LUMA_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const err = new Error(`Luma API ${response.status}: ${body || response.statusText}`);
    (err as any).status = response.status;
    throw err;
  }

  return response;
}

/**
 * Generate an AI video via Luma Dream Machine.
 * Retries up to 3 times with exponential backoff on transient failures.
 */
export async function generateLumaVideo(
  prompt: string,
  duration: number = 5,
  aspectRatio: string = "9:16",
): Promise<LumaGenerationResult> {
  if (!isLumaEnabled()) {
    console.warn("[luma] LUMA_API_KEY not configured — B-roll generation skipped");
    return { id: "luma_disabled", status: "failed", error: "LUMA_API_KEY not configured" };
  }

  return logApiCall({
    service: "luma",
    method: "POST",
    endpoint: "dream-machine/v1/generations",
    requestSummary: `prompt: ${prompt.slice(0, 100)} | aspect: ${aspectRatio}`,
    fn: () =>
      retryWithBackoff(async () => {
        const response = await lumaFetch("/generations", {
          method: "POST",
          body: JSON.stringify({
            prompt,
            aspect_ratio: aspectRatio,
            loop: false,
          }),
        });

        const data = await response.json();
        return {
          id: data.id,
          status: data.state || "queued",
          videoUrl: data.assets?.video,
        } as LumaGenerationResult;
      }, 3, 1000),
  });
}

/**
 * Check the status of a Luma generation.
 * Retries up to 2 times — status checks should be lightweight.
 */
export async function checkLumaStatus(generationId: string): Promise<LumaGenerationResult> {
  if (!isLumaEnabled()) {
    return { id: generationId, status: "failed", error: "LUMA_API_KEY not configured" };
  }

  return logApiCall({
    service: "luma",
    method: "GET",
    endpoint: `dream-machine/v1/generations/${generationId}`,
    requestSummary: `check status: ${generationId}`,
    fn: () =>
      retryWithBackoff(async () => {
        const response = await lumaFetch(`/generations/${generationId}`);
        const data = await response.json();

        return {
          id: data.id,
          status: data.state || "unknown",
          videoUrl: data.assets?.video,
        } as LumaGenerationResult;
      }, 2, 500),
  });
}
