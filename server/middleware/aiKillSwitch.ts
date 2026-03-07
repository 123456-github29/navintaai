/**
 * AI Kill Switch Middleware
 * Provides a global toggle to disable all AI features
 * Set DISABLE_AI=true to disable all AI endpoints
 */

import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function aiKillSwitch(req: Request, res: Response, next: NextFunction) {
  if (config.ai.disabled) {
    const requestId = (req as any).requestId || "unknown";
    const userId = (req as any).user?.sub || "anonymous";
    console.log(`[AI-DISABLED] [${requestId}] [user:${userId}] Blocked AI request to ${req.path}`);
    
    return res.status(503).json({
      error: {
        message: "AI features are temporarily disabled for maintenance",
        code: "AI_DISABLED",
      },
    });
  }
  next();
}

export function logAIRequest(endpoint: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || "unknown";
    const userId = (req as any).user?.sub || "anonymous";
    console.log(`[AI-REQUEST] [${requestId}] [user:${userId}] ${endpoint}`);
    next();
  };
}
