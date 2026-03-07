/**
 * File Upload Security Middleware
 * Implements OWASP file upload security best practices
 * - MIME type validation (header + magic bytes)
 * - Safe filename generation
 * - Size limits
 * - Executable blocking
 * - Path traversal prevention
 */

import type { Request, Response, NextFunction } from "express";
import { createError } from "./errorHandler";
import { randomUUID } from "crypto";
import path from "path";

// Allowed video MIME types and their magic bytes
const ALLOWED_VIDEO_TYPES: Record<string, Buffer[]> = {
  "video/mp4": [
    Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
  ],
  "video/webm": [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
  "video/quicktime": [
    Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]),
  ],
};

// Blocked file extensions (executables, scripts)
const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".js", ".mjs",
  ".py", ".rb", ".php", ".jsp", ".asp", ".aspx", ".dll", ".so",
  ".com", ".scr", ".pif", ".msi", ".jar", ".class",
];

// Maximum file sizes
export const MAX_FILE_SIZES = {
  video: 500 * 1024 * 1024, // 500MB
  image: 10 * 1024 * 1024, // 10MB
  default: 50 * 1024 * 1024, // 50MB
};

// Active uploads per user (for concurrency limiting)
const activeUploads = new Map<string, number>();
const MAX_CONCURRENT_UPLOADS = 3;

/**
 * Check if file extension is blocked
 */
export function isBlockedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return BLOCKED_EXTENSIONS.includes(ext);
}

/**
 * Validate MIME type against magic bytes
 */
export function validateMagicBytes(
  buffer: Buffer,
  declaredMimeType: string
): boolean {
  const magicBytes = ALLOWED_VIDEO_TYPES[declaredMimeType];
  if (!magicBytes) return false;

  return magicBytes.some(magic => {
    if (buffer.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) return false;
    }
    return true;
  });
}

/**
 * Generate a safe filename with UUID
 */
export function generateSafeFilename(
  originalFilename: string,
  userId: string
): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9.]/gi, "").substring(0, 10);
  const timestamp = Date.now();
  const uuid = randomUUID().substring(0, 8);
  return `${userId.substring(0, 8)}_${timestamp}_${uuid}${safeExt}`;
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizePath(filepath: string): string {
  return filepath
    .replace(/\.\./g, "")
    .replace(/[\/\\]+/g, "/")
    .replace(/^\/+/, "");
}

/**
 * Middleware to track and limit concurrent uploads per user
 */
export function limitConcurrentUploads(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req as any).user?.sub;
  if (!userId) {
    return next(createError("Authentication required", 401, "UNAUTHORIZED"));
  }

  const currentUploads = activeUploads.get(userId) || 0;
  if (currentUploads >= MAX_CONCURRENT_UPLOADS) {
    return next(
      createError(
        "Too many concurrent uploads. Please wait for existing uploads to complete.",
        429,
        "CONCURRENT_UPLOAD_LIMIT"
      )
    );
  }

  activeUploads.set(userId, currentUploads + 1);

  res.on("finish", () => {
    const count = activeUploads.get(userId) || 1;
    if (count <= 1) {
      activeUploads.delete(userId);
    } else {
      activeUploads.set(userId, count - 1);
    }
  });

  next();
}

/**
 * Middleware to validate uploaded file
 */
export function validateUploadedFile(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const file = (req as any).file;
  if (!file) {
    return next();
  }

  // Check for blocked extensions
  if (isBlockedExtension(file.originalname)) {
    return next(
      createError(
        "File type not allowed",
        400,
        "BLOCKED_FILE_TYPE"
      )
    );
  }

  // Check file size
  if (file.size > MAX_FILE_SIZES.video) {
    return next(
      createError(
        `File too large. Maximum size is ${MAX_FILE_SIZES.video / (1024 * 1024)}MB`,
        400,
        "FILE_TOO_LARGE"
      )
    );
  }

  // Validate MIME type if video
  if (file.mimetype.startsWith("video/")) {
    if (!ALLOWED_VIDEO_TYPES[file.mimetype]) {
      return next(
        createError(
          "Unsupported video format",
          400,
          "UNSUPPORTED_FORMAT"
        )
      );
    }

    if (file.buffer && !validateMagicBytes(file.buffer, file.mimetype)) {
      return next(
        createError(
          "File content does not match declared type",
          400,
          "MIME_MISMATCH"
        )
      );
    }
  }

  next();
}

/**
 * Get file type category for size limits
 */
export function getFileCategory(mimeType: string): keyof typeof MAX_FILE_SIZES {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "default";
}
