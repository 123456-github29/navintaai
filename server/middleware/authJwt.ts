/**
 * Supabase Authentication Middleware
 * Validates Supabase access tokens from the frontend
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getSupabaseAdmin } from "../lib/supabase";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  console.log(`[auth] requireAuth called for ${req.method} ${req.path}`);
  console.log(`[auth] Token present: ${!!token}`);

  if (!token) {
    console.log(`[auth] No token found, returning 401`);
    res.status(401).json({
      error: { message: "Authentication required", code: "UNAUTHORIZED" }
    });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error(`[auth] Supabase not configured`);
    res.status(503).json({
      error: { message: "Authentication service unavailable", code: "SERVICE_UNAVAILABLE" }
    });
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log(`[auth] Token verification failed:`, error?.message || "No user");
      res.status(401).json({
        error: { message: "Invalid or expired token", code: "UNAUTHORIZED" }
      });
      return;
    }

    console.log(`[auth] Token verified for user: ${user.id}`);

    (req as any).user = {
      sub: user.id,
      email: user.email ?? null,
      firstName: user.user_metadata?.full_name?.split(" ")[0] ?? null,
      lastName: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ?? null,
    };

    next();
  } catch (err: any) {
    console.error(`[auth] Token verification error:`, err.message);
    res.status(401).json({
      error: { message: "Authentication failed", code: "UNAUTHORIZED" }
    });
  }
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          (req as any).user = {
            sub: user.id,
            email: user.email ?? null,
            firstName: user.user_metadata?.full_name?.split(" ")[0] ?? null,
            lastName: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ?? null,
          };
        }
      } catch {
        // Token invalid, continue without user
      }
    }
  }

  next();
};

// Legacy exports for compatibility (no-op for Supabase auth)
export function blacklistToken(_token: string): void {
  // No-op: Supabase handles token invalidation
}

export function isTokenBlacklisted(_token: string): boolean {
  return false;
}
