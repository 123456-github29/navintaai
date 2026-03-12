import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { promises as fs } from "fs";
import path from "path";
// Validate environment variables on startup (fails fast if missing)
import { config } from "./config";
// Security middleware
import { setupSecurity } from "./middleware/security";
import { setupRateLimiting } from "./middleware/rateLimit";
import { requestIdMiddleware, errorHandler } from "./middleware/errorHandler";
import { sanitizeRequestBody } from "./middleware/validation";
import { ensureStorageBuckets } from "./lib/supabaseStorage";


const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.get("/", (req: Request, res: Response, next: NextFunction) => {
  const accept = req.headers.accept || "";
  if (!accept.includes("text/html")) {
    return res.status(200).json({ ok: true });
  }
  next();
});

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Redirect www to non-www (important for OAuth callbacks)
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.get("host") || "";
  if (host.startsWith("www.")) {
    const newHost = host.replace(/^www\./, "");
    const protocol = req.protocol;
    return res.redirect(301, `${protocol}://${newHost}${req.originalUrl}`);
  }
  next();
});

// Request timeout protection
app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout = config.server.requestTimeout;
  req.setTimeout(timeout);
  res.setTimeout(timeout, () => {
    if (!res.headersSent) {
      res.status(408).json({
        error: { message: "Request timeout", code: "REQUEST_TIMEOUT" }
      });
    }
  });
  next();
});

// Security middleware (CORS, Helmet)
app.set("trust proxy", 1);
setupSecurity(app);

// Cookie parser (required for JWT-from-cookie)
app.use(cookieParser());

// Note: Health and readiness endpoints are defined in routes.ts

// Capture raw body for Stripe webhook signature verification
app.use('/api/stripe/webhook', (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
});
app.use('/api/webhook', (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
});

// Body parsing with size limits for all other routes
const maxRequestSize = config.server.maxRequestSize;
app.use(express.json({
  limit: maxRequestSize,
}));
app.use(express.urlencoded({ extended: false, limit: maxRequestSize }));

// Sanitize all request bodies
app.use(sanitizeRequestBody);

// Rate limiting (applied to /api routes)
setupRateLimiting(app);

// Dev convenience: when running Vite separately, redirect "/" on the backend to the Vite dev server
if (process.env.NODE_ENV === "development" && process.env.SKIP_VITE_MIDDLEWARE) {
  const viteUrl = process.env.VITE_DEV_URL ?? "http://localhost:5000";
  app.get("/", (_req, res) => res.redirect(viteUrl));
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const requestId = (req as any).requestId || "unknown";
      let logLine = `[${requestId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const port = Number(process.env.PORT);
  console.log("[boot] process.env.PORT =", process.env.PORT);
  if (!port) {
    throw new Error("PORT env var not set");
  }
  const host = "0.0.0.0";

  const http = await import("http");
  const server = http.createServer(app);

  server.listen({ port, host }, () => {
    console.log(`serving on ${host}:${port}`);
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      log("HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => {
      log("Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  // Ensure upload directories exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  const clipsDir = path.join(uploadsDir, "clips");
  const clipsRawDir = path.join(clipsDir, "raw");
  const clipsNormalizedDir = path.join(clipsDir, "normalized");
  const videosDir = path.join(uploadsDir, "videos");
  const tempDir = path.join(uploadsDir, "temp");

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(clipsDir, { recursive: true });
  await fs.mkdir(clipsRawDir, { recursive: true });
  await fs.mkdir(clipsNormalizedDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });
  log("Upload directories initialized");
  
  ensureStorageBuckets().then(() => {
    log("Supabase Storage buckets initialized");
  }).catch((err) => {
    console.error("[boot] Storage bucket init failed (non-fatal):", err.message);
  });

  try {
    const { renderRouter } = await import("../src/api/routes");
    app.use(renderRouter);
  } catch (err: any) {
    console.warn("[boot] Render router import failed (non-fatal):", err.message);
  }

  try {
    const { RenderJobService } = await import("../src/services/renderJob.service");
    RenderJobService.startWorker();
  } catch (err: any) {
    console.error("[boot] RenderWorker startup failed (non-fatal):", err.message);
  }

  let redisHealthy = false;
  if (process.env.REDIS_URL) {
    try {
      const { getRedisConnection } = await import("../src/queue/redis");
      const conn = getRedisConnection();
      const pong = await conn.ping();
      await conn.set("_health", "1", "EX", 60);
      redisHealthy = true;
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("max requests limit")) {
        console.warn("[boot] Redis request limit exceeded — skipping queue workers (using inline processing)");
      } else {
        console.warn("[boot] Redis unavailable, skipping queue workers:", msg.substring(0, 120));
      }
      try {
        const { closeRedis } = await import("../src/queue/redis");
        await closeRedis();
      } catch {}
    }
  }

  if (redisHealthy) {
    try {
      const { startProEditWorker } = await import("../src/worker/proedit.worker");
      startProEditWorker();
    } catch (err: any) {
      console.error("[boot] ProEdit worker startup failed (non-fatal):", err.message);
    }

    try {
      const { startStudioWorker } = await import("../src/worker/studio.worker");
      startStudioWorker();
    } catch (err: any) {
      console.error("[boot] Studio worker startup failed (non-fatal):", err.message);
    }

    try {
      const { startLumaWorker } = await import("../src/worker/luma.worker");
      startLumaWorker();
    } catch (err: any) {
      console.error("[boot] Luma worker startup failed (non-fatal):", err.message);
    }
  } else {
    console.log("[boot] Queue workers disabled — using inline processing");
  }

  await registerRoutes(app, server);

  app.use(errorHandler);

  if (app.get("env") === "development" && !process.env.SKIP_VITE_MIDDLEWARE) {
    await setupVite(app, server);
  } else if (app.get("env") !== "development") {
    serveStatic(app);
  }

  log("All routes and middleware initialized");
})();
