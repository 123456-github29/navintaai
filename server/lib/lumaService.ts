import { createHash } from "crypto";
import { getSupabaseAdmin } from "./supabase";

const LUMA_API_BASE_URL = "https://api.lumalabs.ai/dream-machine/v1";
const LUMA_MODEL = "ray-2";
const BROLL_BUCKET = "broll";
const MAX_PROMPT_LENGTH = 500;
const POLL_HARD_TIMEOUT_MS = 6 * 60 * 1000;
const POLL_INITIAL_DELAY_MS = 1000;
const POLL_MAX_DELAY_MS = 60000;

const BLOCKED_KEYWORDS = [
  "nike", "adidas", "coca-cola", "pepsi", "apple", "google", "microsoft",
  "disney", "marvel", "pokemon", "star wars", "harry potter", "mcdonald",
  "samsung", "tesla", "amazon", "facebook", "instagram", "tiktok",
  "nsfw", "nude", "naked", "porn", "sex", "erotic", "explicit",
  "gore", "violence", "blood", "murder", "kill", "weapon",
  "drug", "cocaine", "heroin", "meth",
];

export type LumaGenerationType = "text_to_video" | "image_to_video" | "extend" | "loop";

export type LumaCameraMove =
  | "static" | "orbit_left" | "orbit_right" | "orbit_up" | "orbit_down"
  | "dolly_in" | "dolly_out" | "pan_left" | "pan_right" | "pan_up" | "pan_down"
  | "tilt_up" | "tilt_down" | "crane_up" | "crane_down"
  | "tracking_left" | "tracking_right" | "zoom_in" | "zoom_out"
  | "handheld" | "push_in" | "pull_out";

export interface LumaKeyframe {
  type: "image" | "generation";
  url?: string;
  id?: string;
}

export interface LumaGenerationRequest {
  prompt: string;
  model: string;
  aspect_ratio?: string;
  duration?: string;
  loop?: boolean;
  keyframes?: {
    frame0?: LumaKeyframe | null;
    frame1?: LumaKeyframe | null;
  };
  resolution?: string;
}

export interface LumaGenerationResponse {
  id: string;
  generation_type: string;
  state: "queued" | "dreaming" | "completed" | "failed";
  failure_reason?: string;
  model?: string;
  assets?: {
    video?: string;
  };
  request?: {
    prompt?: string;
    aspect_ratio?: string;
    loop?: boolean;
    duration?: string;
    keyframes?: any;
  };
  created_at: string;
}

function getLumaApiKey(): string {
  const key = process.env.LUMA_API_KEY;
  if (!key) {
    throw new Error("LUMA_API_KEY environment variable is not set");
  }
  return key;
}

export function computeCacheKey(
  prompt: string,
  aspectRatio: string,
  durationSeconds: number,
  extras?: string
): string {
  return createHash("sha256")
    .update(`${prompt}${aspectRatio}${durationSeconds}${extras || ""}`)
    .digest("hex");
}

export function sanitizePrompt(prompt: string): string {
  let sanitized = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
  sanitized = sanitized.replace(/[<>{}]/g, "");
  return sanitized;
}

export function validatePrompt(prompt: string): { valid: boolean; reason?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, reason: "Prompt cannot be empty" };
  }
  if (prompt.trim().length < 5) {
    return { valid: false, reason: "Prompt must be at least 5 characters" };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, reason: `Prompt exceeds ${MAX_PROMPT_LENGTH} character limit` };
  }
  const lower = prompt.toLowerCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { valid: false, reason: `Prompt contains blocked content: "${keyword}"` };
    }
  }
  return { valid: true };
}

export function buildCameraPrompt(
  basePrompt: string,
  cameraMove?: LumaCameraMove
): string {
  if (!cameraMove || cameraMove === "static") return basePrompt;

  const cameraDescriptions: Record<string, string> = {
    orbit_left: "smooth orbital camera movement to the left",
    orbit_right: "smooth orbital camera movement to the right",
    orbit_up: "smooth orbital camera movement upward",
    orbit_down: "smooth orbital camera movement downward",
    dolly_in: "smooth dolly push-in toward the subject",
    dolly_out: "smooth dolly pull-out from the subject",
    pan_left: "smooth horizontal pan to the left",
    pan_right: "smooth horizontal pan to the right",
    pan_up: "smooth vertical pan upward",
    pan_down: "smooth vertical pan downward",
    tilt_up: "gentle camera tilt upward",
    tilt_down: "gentle camera tilt downward",
    crane_up: "cinematic crane shot moving upward",
    crane_down: "cinematic crane shot moving downward",
    tracking_left: "tracking shot moving left alongside subject",
    tracking_right: "tracking shot moving right alongside subject",
    zoom_in: "slow cinematic zoom in",
    zoom_out: "slow cinematic zoom out revealing the scene",
    handheld: "subtle handheld camera movement with natural sway",
    push_in: "dramatic push-in toward the focal point",
    pull_out: "wide pull-out revealing the full scene",
  };

  const desc = cameraDescriptions[cameraMove] || cameraMove.replace(/_/g, " ");
  return `${basePrompt}, ${desc}`;
}

async function callLumaApi(body: LumaGenerationRequest): Promise<LumaGenerationResponse> {
  const apiKey = getLumaApiKey();

  const response = await fetch(`${LUMA_API_BASE_URL}/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Luma API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as LumaGenerationResponse;
  console.log(`[luma] Generation created: ${data.id}, state: ${data.state}, type: ${data.generation_type}`);
  return data;
}

export async function createGeneration(
  prompt: string,
  aspectRatio: string = "9:16",
  durationSeconds: number = 5,
  options?: {
    cameraMove?: LumaCameraMove;
    loop?: boolean;
    resolution?: string;
  }
): Promise<LumaGenerationResponse> {
  let finalPrompt = sanitizePrompt(prompt);
  if (options?.cameraMove) {
    finalPrompt = buildCameraPrompt(finalPrompt, options.cameraMove);
  }

  const validation = validatePrompt(finalPrompt);
  if (!validation.valid) {
    throw new Error(`Invalid prompt: ${validation.reason}`);
  }

  const body: LumaGenerationRequest = {
    prompt: finalPrompt,
    model: LUMA_MODEL,
    aspect_ratio: aspectRatio,
    duration: `${durationSeconds}s`,
    loop: options?.loop || false,
  };

  if (options?.resolution) {
    body.resolution = options.resolution;
  }

  return callLumaApi(body);
}

export async function createImageToVideo(
  prompt: string,
  imageUrl: string,
  aspectRatio: string = "9:16",
  durationSeconds: number = 5,
  options?: {
    cameraMove?: LumaCameraMove;
    loop?: boolean;
    endImageUrl?: string;
    resolution?: string;
  }
): Promise<LumaGenerationResponse> {
  let finalPrompt = sanitizePrompt(prompt);
  if (options?.cameraMove) {
    finalPrompt = buildCameraPrompt(finalPrompt, options.cameraMove);
  }

  const validation = validatePrompt(finalPrompt);
  if (!validation.valid) {
    throw new Error(`Invalid prompt: ${validation.reason}`);
  }

  const body: LumaGenerationRequest = {
    prompt: finalPrompt,
    model: LUMA_MODEL,
    aspect_ratio: aspectRatio,
    duration: `${durationSeconds}s`,
    loop: options?.loop || false,
    keyframes: {
      frame0: { type: "image", url: imageUrl },
      frame1: options?.endImageUrl ? { type: "image", url: options.endImageUrl } : null,
    },
  };

  if (options?.resolution) {
    body.resolution = options.resolution;
  }

  return callLumaApi(body);
}

export async function extendGeneration(
  prompt: string,
  sourceGenerationId: string,
  options?: {
    cameraMove?: LumaCameraMove;
    loop?: boolean;
    durationSeconds?: number;
    aspectRatio?: string;
    resolution?: string;
  }
): Promise<LumaGenerationResponse> {
  let finalPrompt = sanitizePrompt(prompt);
  if (options?.cameraMove) {
    finalPrompt = buildCameraPrompt(finalPrompt, options.cameraMove);
  }

  const validation = validatePrompt(finalPrompt);
  if (!validation.valid) {
    throw new Error(`Invalid prompt: ${validation.reason}`);
  }

  const body: LumaGenerationRequest = {
    prompt: finalPrompt,
    model: LUMA_MODEL,
    aspect_ratio: options?.aspectRatio || "9:16",
    duration: `${options?.durationSeconds || 5}s`,
    loop: options?.loop || false,
    keyframes: {
      frame0: { type: "generation", id: sourceGenerationId },
    },
  };

  if (options?.resolution) {
    body.resolution = options.resolution;
  }

  return callLumaApi(body);
}

export async function pollGeneration(jobId: string): Promise<LumaGenerationResponse> {
  const apiKey = getLumaApiKey();
  const startTime = Date.now();
  let delay = POLL_INITIAL_DELAY_MS;

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= POLL_HARD_TIMEOUT_MS) {
      throw new Error(`Luma generation ${jobId} timed out after ${POLL_HARD_TIMEOUT_MS / 1000}s`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));

    const response = await fetch(`${LUMA_API_BASE_URL}/generations/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Luma API poll error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as LumaGenerationResponse;

    if (data.state === "completed") {
      console.log(`[luma] Generation ${jobId} completed`);
      return data;
    }

    if (data.state === "failed") {
      throw new Error(
        `Luma generation ${jobId} failed: ${data.failure_reason || "Unknown reason"}`
      );
    }

    console.log(`[luma] Generation ${jobId} state: ${data.state}, polling again in ${delay}ms`);
    delay = Math.min(delay * 2, POLL_MAX_DELAY_MS);
  }
}

export async function getGeneration(jobId: string): Promise<LumaGenerationResponse> {
  const apiKey = getLumaApiKey();

  const response = await fetch(`${LUMA_API_BASE_URL}/generations/${jobId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Luma API error (${response.status}): ${errorText}`);
  }

  return (await response.json()) as LumaGenerationResponse;
}

export async function deleteGeneration(jobId: string): Promise<void> {
  const apiKey = getLumaApiKey();

  const response = await fetch(`${LUMA_API_BASE_URL}/generations/${jobId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Luma API delete error (${response.status}): ${errorText}`);
  }

  console.log(`[luma] Generation ${jobId} deleted`);
}

export async function downloadAndStore(
  assetUrl: string,
  storagePath: string
): Promise<{ path: string; url: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available for B-roll upload");
  }

  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Luma asset: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`[luma] Downloaded asset (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  const { error: uploadError } = await supabase.storage
    .from(BROLL_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload to storage: ${uploadError.message}`);
  }

  const { data: urlData } = await supabase.storage
    .from(BROLL_BUCKET)
    .createSignedUrl(storagePath, 3600 * 24);

  const signedUrl = urlData?.signedUrl || "";
  console.log(`[luma] Stored asset at ${storagePath}`);

  return { path: storagePath, url: signedUrl };
}

export const CAMERA_MOVES: LumaCameraMove[] = [
  "static", "orbit_left", "orbit_right", "orbit_up", "orbit_down",
  "dolly_in", "dolly_out", "pan_left", "pan_right", "pan_up", "pan_down",
  "tilt_up", "tilt_down", "crane_up", "crane_down",
  "tracking_left", "tracking_right", "zoom_in", "zoom_out",
  "handheld", "push_in", "pull_out",
];
