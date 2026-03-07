import { z } from "zod";

const AUTOEDIT_URL = process.env.AUTOEDIT_SERVICE_URL || process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
const ML_TOKEN = process.env.ML_SERVICE_TOKEN || "";
const AUTOEDIT_TIMEOUT_MS = 10 * 60 * 1000;

const WordSchema = z.object({
  text: z.string(),
  startMs: z.number(),
  endMs: z.number(),
  startFrame: z.number(),
  endFrame: z.number(),
});

const ClipSchema = z.object({
  id: z.string(),
  src: z.string(),
  trimStartFrame: z.number(),
  durationInFrames: z.number(),
  zoomTarget: z.number(),
  words: z.array(WordSchema),
});

const EDLResponseSchema = z.object({
  fps: z.number(),
  clips: z.array(ClipSchema),
  musicSrc: z.string().nullable(),
  meta: z.object({
    faceRatio: z.number().nullable().optional(),
    avgMotion: z.number().nullable().optional(),
  }).optional(),
});

export type AutoEditEDL = z.infer<typeof EDLResponseSchema>;

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ML_TOKEN) {
    headers["Authorization"] = `Bearer ${ML_TOKEN}`;
  }
  return headers;
}

export async function checkAutoeditHealth(): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${AUTOEDIT_URL}/health`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        if (attempt < 4) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return false;
      }
      const data = await res.json();
      return data?.ok === true;
    } catch {
      if (attempt < 4) { await new Promise(r => setTimeout(r, 2000)); continue; }
      return false;
    }
  }
  return false;
}

export async function generateAutoEditEDL(params: {
  videoUrl: string;
  fps?: number;
  mode?: "talking_head" | "multi_shot";
}): Promise<AutoEditEDL> {
  const { videoUrl, fps = 30, mode = "talking_head" } = params;

  const healthy = await checkAutoeditHealth();
  if (!healthy) {
    throw new Error(
      `AutoEdit service unavailable at ${AUTOEDIT_URL}. ` +
      `Ensure the Python service is running (npm run dev:py).`
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTOEDIT_TIMEOUT_MS);

  try {
    const res = await fetch(`${AUTOEDIT_URL}/autoedit`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        video_url: videoUrl,
        fps,
        mode,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "Unknown error");
      throw new Error(`AutoEdit service returned ${res.status}: ${errorBody}`);
    }

    const raw = await res.json();
    const validated = EDLResponseSchema.parse(raw);
    return validated;
  } finally {
    clearTimeout(timeout);
  }
}
