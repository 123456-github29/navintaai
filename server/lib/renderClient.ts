import type { EDL } from "../../src/remotion/types/edl";

const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || "";
const ML_SERVICE_TOKEN = process.env.ML_SERVICE_TOKEN || "";
const RENDER_TIMEOUT_MS = 10 * 60 * 1000;

interface RenderRequest {
  edl: EDL;
  composition?: "TikTokStyle" | "NavintaPremium";
  userId: string;
  videoId: string;
  watermark?: boolean;
  accentColor?: string;
  captionFontSize?: number;
  captionStyleSpec?: any;
}

interface RenderResponse {
  success: boolean;
  storagePath: string | null;
  signedUrl: string | null;
  durationMs: number;
  framesRendered: number;
}

export function isRenderServiceAvailable(): boolean {
  return !!RENDER_SERVICE_URL;
}

export async function renderViaCloudRun(request: RenderRequest): Promise<RenderResponse> {
  if (!RENDER_SERVICE_URL) {
    throw new Error("RENDER_SERVICE_URL is not configured");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ML_SERVICE_TOKEN) {
    headers["Authorization"] = `Bearer ${ML_SERVICE_TOKEN}`;
  }

  console.log(`[renderClient] Sending render request to ${RENDER_SERVICE_URL}/render`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

  try {
    const res = await fetch(`${RENDER_SERVICE_URL}/render`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "Unknown error");
      throw new Error(`Render service returned ${res.status}: ${errorBody}`);
    }

    const data: RenderResponse = await res.json();

    if (!data.success) {
      throw new Error("Render service returned success=false");
    }

    console.log(`[renderClient] Render complete in ${data.durationMs}ms, ${data.framesRendered} frames`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
