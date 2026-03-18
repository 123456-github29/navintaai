/**
 * Request validation middleware using Zod
 * Implements OWASP input validation best practices
 * - Validates request bodies, query params, and route params
 * - Sanitizes string inputs to prevent XSS and injection
 * - Rejects unknown fields (whitelist approach)
 */

import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { createError } from "./errorHandler";

interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * Sanitize string input to prevent XSS, injection attacks, and ByteString encoding issues
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFC")
    .replace(/[\u2028\u2029]/g, "\n")
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/data:/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") return "unnamed";
  return filename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/\.\./g, "")
    .replace(/^\.+/, "")
    .slice(0, 100);
}

/**
 * Deep sanitize all string values in an object
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === "string") return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Middleware to sanitize all string inputs in request body
 */
export function sanitizeRequestBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Validate request data against Zod schemas
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = createError(
          "Validation failed",
          422,
          "VALIDATION_ERROR"
        );
        (validationError as any).details = error.format();
        return next(validationError);
      }
      next(error);
    }
  };
}

export function validateBody<T extends z.ZodSchema>(schema: T) {
  return validate({ body: schema });
}

export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return validate({ query: schema });
}

export function validateParams<T extends z.ZodSchema>(schema: T) {
  return validate({ params: schema });
}

// Common validation schemas for reuse
export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["planned", "filming", "editing", "review", "scheduled", "published", "completed"]),
}).strict();

export const shotUpdateSchema = z.object({
  completed: z.boolean(),
}).strict();

export const videoExportSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  hasCaption: z.boolean().optional().default(false),
  captionStyle: z.string().max(50).optional().default("viral"),
  musicStyle: z.string().max(100).optional(),
}).strict();

export const brandKitSchema = z.object({
  brandName: z.string().min(1).max(100).transform(sanitizeString),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  fonts: z.record(z.string(), z.string()).optional().default({}),
}).strict();

