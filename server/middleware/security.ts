/**
 * Security middleware: CORS, Helmet headers, and OWASP protections
 * Implements comprehensive security headers and CORS configuration
 */

import cors from "cors";
import helmet from "helmet";
import type { Express, Request, Response, NextFunction } from "express";

export function setupSecurity(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";

  // Security headers (Helmet) - OWASP recommended headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          mediaSrc: [
            "'self'",
            "blob:",
            "data:",
            "https://*.supabase.co",
            "https://*.supabase.in",
          ],
          connectSrc: [
            "'self'",
            "https://*.supabase.co",
            "https://*.supabase.in",
            "https://api.openai.com",
            "https://generativelanguage.googleapis.com",
            ...(isProduction ? [] : ["ws:", "wss:"]),
          ],
          frameSrc: ["'self'"],
          frameAncestors: ["'self'", "https://navinta.org", "https://www.navinta.org"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
      noSniff: true,
      ieNoOpen: true,
      frameguard: false,
    })
  );

  // Additional security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=(self)");
    if (isProduction) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  // CORS configuration with strict origin control
  const publicUrl = process.env.PUBLIC_URL;
  const defaultProductionOrigins = publicUrl ? [publicUrl] : [];
  
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
    : isProduction
    ? defaultProductionOrigins
    : ["http://localhost:5000", "http://localhost:5173", "http://0.0.0.0:5000"];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || !isProduction) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    maxAge: 86400,
  };

  app.use(cors(corsOptions));

  // Block requests with suspicious headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"];
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      if (contentType && !contentType.includes("application/json") &&
          !contentType.includes("multipart/form-data") &&
          !contentType.includes("application/x-www-form-urlencoded")) {
        return res.status(415).json({ error: "Unsupported content type" });
      }
    }
    next();
  });
}

