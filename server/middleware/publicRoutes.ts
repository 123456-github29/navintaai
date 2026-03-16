/**
 * Public routes allowlist - routes that don't require authentication
 */

import type { Request, Response, NextFunction } from "express";

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  "GET /api/health",
  "GET /api/ready",
  "GET /api/login",
  "GET /api/auth/google/callback",
  "POST /api/auth/logout",
  "GET /api/trending-music",
  "GET /api/trending-music/:vibe",
  "GET /api/pexels",
  "GET /api/pexels/media",
  "GET /api/pexels/videos",
  "GET /api/pexels/photos",
  "POST /api/stripe/webhook",
  "POST /api/terms/accept",
  "GET /api/health/queue",
  // Recording session endpoints - authenticated via session token in query/body, not user auth
  "GET /api/recording-sessions/:sid",
  "GET /api/recording-sessions/:sid/upload-url",
  "POST /api/recording-sessions/:sid/complete",
];

/**
 * Check if a route is in the public allowlist
 */
export function isPublicRoute(method: string, path: string): boolean {
  // Normalize path (remove query string)
  const normalizedPath = path.split("?")[0];
  
  for (const publicRoute of PUBLIC_ROUTES) {
    const [publicMethod, publicPath] = publicRoute.split(" ");
    
    // Exact match
    if (publicMethod === method && publicPath === normalizedPath) {
      return true;
    }
    
    // Pattern match for routes with parameters (e.g., /api/trending-music/:vibe)
    if (publicMethod === method) {
      const publicPathPattern = publicPath.replace(/:[^/]+/g, "[^/]+");
      const regex = new RegExp(`^${publicPathPattern}$`);
      if (regex.test(normalizedPath)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Middleware to mark public routes (adds req.isPublicRoute flag)
 */
export function publicRoutesMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  (req as any).isPublicRoute = isPublicRoute(req.method, req.path);
  next();
}

