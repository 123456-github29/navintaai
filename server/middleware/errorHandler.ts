/**
 * Standardized error handling middleware
 * Ensures consistent error response format: { error: { message, code, requestId } }
 */

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

function sanitizeErrorMessage(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  expose?: boolean; // Whether to expose error message to client
}

/**
 * Standardized error response format
 */
export function createErrorResponse(
  message: string,
  code: string,
  statusCode: number,
  requestId?: string
) {
  return {
    error: {
      message,
      code,
      requestId: requestId || undefined,
    },
  };
}

/**
 * Request ID middleware - adds unique ID to each request for correlation
 */
export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  req.requestId = randomUUID();
  next();
}

/**
 * Error handler middleware - must be last
 */
export function errorHandler(
  err: ApiError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId || randomUUID();
  const statusCode = (err as ApiError).statusCode || 500;
  const code = (err as ApiError).code || "INTERNAL_SERVER_ERROR";
  const expose = (err as ApiError).expose !== false;

  // Log error with stack trace (server-side only)
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    code,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Don't expose internal error details in production
  const rawMessage =
    expose || process.env.NODE_ENV !== "production"
      ? err.message
      : "An internal server error occurred";

  // Sanitize error message to remove Unicode line separators that cause ByteString errors
  const message = sanitizeErrorMessage(rawMessage);

  res.status(statusCode).json(createErrorResponse(message, code, statusCode, requestId));
}

/**
 * Async error wrapper - catches errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a standardized error object
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  expose: boolean = true
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code || getDefaultErrorCode(statusCode);
  error.expose = expose;
  return error;
}

/**
 * Get default error code based on HTTP status
 */
function getDefaultErrorCode(statusCode: number): string {
  const codes: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMIT_EXCEEDED",
    500: "INTERNAL_SERVER_ERROR",
    503: "SERVICE_UNAVAILABLE",
  };
  return codes[statusCode] || "UNKNOWN_ERROR";
}

