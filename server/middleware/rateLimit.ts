/**
 * Rate limiting middleware
 * Protects against brute force, abuse, and resource exhaustion
 * Implements IP-based rate limiting with user-aware keying where applicable
 */

import rateLimit from "express-rate-limit";
import type { Express, Request, Response } from "express";

// General API rate limiter (applied to all /api routes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: {
      message: "Too many requests, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: {
        message: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: res.getHeader("Retry-After"),
      },
    });
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: {
      message: "Too many authentication attempts, please try again later",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
    },
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Rate limiter for upload/export endpoints: 10 requests/minute/IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: {
      message: "Too many upload requests, please try again later",
      code: "UPLOAD_RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Rate limiter for AI endpoints: 5 requests/minute/IP for generate-plan, generate-caption
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: {
      message: "Too many AI requests, please try again later",
      code: "AI_RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Rate limiter for video generation: 2 requests/minute/IP
export const videoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  message: {
    error: {
      message: "Too many video generation requests, please try again later",
      code: "VIDEO_RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Very strict limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: {
      message: "Too many attempts, please try again later",
      code: "STRICT_RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

export const brollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    error: {
      message: "Too many B-roll generation requests, please try again later",
      code: "BROLL_RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Burst protection for rapid requests
export const burstLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  message: {
    error: {
      message: "Too many requests in a short time, please slow down",
      code: "BURST_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

export function setupRateLimiting(app: Express) {
  app.use("/api", burstLimiter);
  app.use("/api", apiLimiter);
}
