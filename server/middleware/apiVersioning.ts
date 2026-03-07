/**
 * API Versioning Middleware
 * Adds /api/v1 routes that mirror existing /api routes
 * Existing /api routes continue to work for backward compatibility
 */

import type { Express, Request, Response, NextFunction } from "express";

/**
 * Creates versioned route handlers that forward to existing routes
 * This allows mobile clients to use /api/v1/* while web clients continue using /api/*
 */
export function setupApiVersioning(app: Express, registerV1Routes: (app: Express) => void) {
  // Register v1 routes (they will be identical to /api routes but under /api/v1)
  // This is a no-op wrapper - the actual routes are registered in routes.ts
  // We just add a middleware that allows /api/v1/* to work alongside /api/*
  
  // For now, we'll document that v1 routes are available
  // In the future, this could add version-specific logic
  registerV1Routes(app);
}

/**
 * Middleware to handle versioned API requests
 * Redirects /api/v1/* to /api/* handlers (backward compatible)
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction) {
  // If request is to /api/v1/*, rewrite to /api/* for route matching
  if (req.path.startsWith("/api/v1/")) {
    req.url = req.path.replace("/api/v1", "/api") + (req.url.split("?")[1] ? `?${req.url.split("?")[1]}` : "");
  }
  next();
}

