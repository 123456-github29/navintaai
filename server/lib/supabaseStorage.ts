/**
 * Supabase Storage helper for video file management
 * Handles upload, download, and signed URL generation for clips and videos
 */

import { getSupabaseAdmin } from "./supabase";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const CLIPS_BUCKET = "clips";
const VIDEOS_BUCKET = "videos";
const RENDERS_BUCKET = "renders";
const BROLL_BUCKET = "broll";

export interface UploadResult {
  path: string;
  url: string;
}

/**
 * Ensure storage buckets exist
 */
export async function ensureStorageBuckets(): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.log("[storage] Supabase not available, skipping bucket creation");
    return;
  }

  const buckets = [CLIPS_BUCKET, VIDEOS_BUCKET, RENDERS_BUCKET, BROLL_BUCKET];
  
  for (const bucketName of buckets) {
    try {
      const { data: existing, error: getError } = await supabase.storage.getBucket(bucketName);
      
      if (existing) {
        console.log(`[storage] Bucket ${bucketName} exists`);
        continue;
      }
      
      // Bucket doesn't exist, try to create it
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: false,
      });
      
      if (error) {
        if (error.message?.includes("already exists")) {
          console.log(`[storage] Bucket ${bucketName} already exists`);
        } else {
          console.error(`[storage] Failed to create bucket ${bucketName}:`, error.message);
        }
      } else {
        console.log(`[storage] Bucket ${bucketName} created`);
      }
    } catch (err: any) {
      console.error(`[storage] Error checking bucket ${bucketName}:`, err.message);
    }
  }
}

/**
 * Upload a video buffer to Supabase Storage
 */
export async function uploadClipToStorage(
  buffer: Buffer,
  userId: string,
  mimeType: string = "video/webm"
): Promise<UploadResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const filename = `${randomUUID()}.${ext}`;
  const storagePath = `${userId}/${filename}`;

  const { data, error } = await supabase.storage
    .from(CLIPS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("[storage] Upload failed:", error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = await supabase.storage
    .from(CLIPS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  return {
    path: storagePath,
    url: urlData?.signedUrl || "",
  };
}

/**
 * Upload a processed video (mp4) to Supabase Storage
 */
export async function uploadVideoToStorage(
  filePath: string,
  userId: string
): Promise<UploadResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const buffer = await fs.readFile(filePath);
  const filename = `${randomUUID()}.mp4`;
  const storagePath = `${userId}/${filename}`;

  const { data, error } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "video/mp4",
      upsert: false,
    });

  if (error) {
    console.error("[storage] Video upload failed:", error);
    throw new Error(`Video upload failed: ${error.message}`);
  }

  const { data: urlData } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .createSignedUrl(storagePath, 3600 * 24);

  return {
    path: storagePath,
    url: urlData?.signedUrl || "",
  };
}

/**
 * Download a clip from Supabase Storage to a local temp file
 */
export async function downloadClipToTemp(
  storagePath: string,
  tempDir: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const { data, error } = await supabase.storage
    .from(CLIPS_BUCKET)
    .download(storagePath);

  if (error) {
    console.error("[storage] Download failed:", error);
    throw new Error(`Storage download failed: ${error.message}`);
  }

  const ext = storagePath.endsWith(".mp4") ? ".mp4" : ".webm";
  const tempFilename = `temp-${randomUUID()}${ext}`;
  const tempPath = path.join(tempDir, tempFilename);

  await fs.mkdir(tempDir, { recursive: true });
  const buffer = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(tempPath, buffer);

  return tempPath;
}

/**
 * Download a video from Supabase Storage to a local temp file
 */
export async function downloadVideoToTemp(
  storagePath: string,
  tempDir: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const { data, error } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .download(storagePath);

  if (error) {
    console.error("[storage] Download failed:", error);
    throw new Error(`Storage download failed: ${error.message}`);
  }

  const tempFilename = `temp-${randomUUID()}.mp4`;
  const tempPath = path.join(tempDir, tempFilename);

  await fs.mkdir(tempDir, { recursive: true });
  const buffer = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(tempPath, buffer);

  return tempPath;
}

/**
 * Get a signed URL for clip playback
 */
export async function getClipSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const { data, error } = await supabase.storage
    .from(CLIPS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("[storage] Failed to create signed URL:", error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Get a signed URL for video playback
 */
export async function getVideoSignedUrl(
  storagePath: string,
  expiresIn: number = 3600 * 24
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const { data, error } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("[storage] Failed to create signed URL:", error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a clip from storage
 */
export async function deleteClipFromStorage(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.storage
    .from(CLIPS_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[storage] Failed to delete clip:", error);
  }
}

/**
 * Delete a video from storage
 */
export async function deleteVideoFromStorage(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[storage] Failed to delete video:", error);
  }
}

/**
 * Upload a rendered video to the renders bucket
 */
export async function uploadRenderToStorage(
  filePath: string,
  userId: string,
  videoId: string
): Promise<UploadResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const buffer = await fs.readFile(filePath);
  const storagePath = `${userId}/${videoId}.mp4`;

  const { data, error } = await supabase.storage
    .from(RENDERS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) {
    console.error("[storage] Render upload failed:", error);
    throw new Error(`Render upload failed: ${error.message}`);
  }

  const { data: urlData } = await supabase.storage
    .from(RENDERS_BUCKET)
    .createSignedUrl(storagePath, 3600 * 24);

  return {
    path: storagePath,
    url: urlData?.signedUrl || "",
  };
}

/**
 * Get a signed URL for render playback/download
 */
export async function getRenderSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage not available");
  }

  const { data, error } = await supabase.storage
    .from(RENDERS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("[storage] Failed to create render signed URL:", error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a render from storage
 */
export async function deleteRenderFromStorage(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.storage
    .from(RENDERS_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error("[storage] Failed to delete render:", error);
  }
}

/**
 * Create a signed upload URL for direct client-side upload to clips bucket
 * SECURITY: The signed URL is limited to the clips bucket and expires after 1 hour
 */
export async function createSignedUploadUrl(
  userId: string,
  mimeType: string = "video/webm"
): Promise<{ uploadUrl: string; storagePath: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[storage] Supabase admin client not available");
    throw new Error("Supabase storage not available. Please check SUPABASE_SERVICE_ROLE_KEY.");
  }

  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const filename = `${randomUUID()}.${ext}`;
  const storagePath = `${userId}/${filename}`;

  console.log(`[storage] Creating signed upload URL for: ${storagePath}`);
  const { data, error } = await supabase.storage
    .from(CLIPS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error("[storage] Signed upload URL creation failed:", error.message);
    console.error("[storage] Error details:", error);
    throw new Error(`Signed upload URL creation failed: ${error.message}`);
  }

  if (!data || !data.signedUrl) {
    console.error("[storage] No signed URL returned from Supabase");
    throw new Error("Signed upload URL creation failed: No URL returned");
  }

  console.log(`[storage] ✓ Signed upload URL created successfully`);
  return {
    uploadUrl: data.signedUrl,
    storagePath,
  };
}

/**
 * Check if storage is available
 */
export function isStorageAvailable(): boolean {
  return getSupabaseAdmin() !== null;
}
