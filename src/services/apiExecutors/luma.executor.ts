import {
  createGeneration,
  pollGeneration,
  downloadAndStore,
  validatePrompt,
  type LumaCameraMove,
  type LumaGenerationResponse,
} from "../../../server/lib/lumaService";

export interface LumaExecutorResult {
  generationId: string;
  videoUrl: string;
  storagePath: string | null;
  storageUrl: string | null;
  prompt: string;
}

export interface LumaExecutorOptions {
  aspectRatio?: string;
  durationSeconds?: number;
  cameraMove?: LumaCameraMove;
  loop?: boolean;
  storeInSupabase?: boolean;
  storagePath?: string;
}

export async function executeLumaGeneration(
  prompt: string,
  options: LumaExecutorOptions = {}
): Promise<LumaExecutorResult> {
  const validation = validatePrompt(prompt);
  if (!validation.valid) {
    throw new Error(`Invalid Luma prompt: ${validation.reason}`);
  }

  const {
    aspectRatio = "9:16",
    durationSeconds = 5,
    cameraMove,
    loop = false,
    storeInSupabase = false,
    storagePath,
  } = options;

  const generation: LumaGenerationResponse = await createGeneration(
    prompt,
    aspectRatio,
    durationSeconds,
    { cameraMove, loop }
  );

  const completed = await pollGeneration(generation.id);

  const videoUrl = completed.assets?.video || "";
  if (!videoUrl) {
    throw new Error(`Luma generation ${generation.id} completed but no video URL returned`);
  }

  let resultStoragePath: string | null = null;
  let resultStorageUrl: string | null = null;

  if (storeInSupabase && storagePath) {
    const stored = await downloadAndStore(videoUrl, storagePath);
    resultStoragePath = stored.path;
    resultStorageUrl = stored.url;
  }

  return {
    generationId: generation.id,
    videoUrl,
    storagePath: resultStoragePath,
    storageUrl: resultStorageUrl,
    prompt,
  };
}
