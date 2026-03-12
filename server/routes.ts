import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync, promises as fs } from "fs";
import { join } from "path";
import { storage } from "./storage";

import { generateViralScript, scriptToShotDialogue, scriptToTeleprompterCards, HOOK_STYLES } from "./lib/script";
import type { HookStyle } from "./lib/script";
import { exportWithEdits } from "./lib/ffmpegExport";

import {
  uploadClipToStorage, 
  uploadVideoToStorage,
  downloadVideoToTemp,
  getClipSignedUrl, 
  getVideoSignedUrl,
  isStorageAvailable,
  ensureStorageBuckets,
  createSignedUploadUrl,
} from "./lib/supabaseStorage";
import { trendingMusicService } from "./lib/trendingMusic";
import { getMixedMedia, getCuratedVideos, getCuratedPhotos, searchPhotos } from "./lib/pexels";
import { insertPostSchema, insertClipSchema } from "@shared/schema";

import { requireAuth } from "./middleware/authJwt";
import rateLimit from "express-rate-limit";
import { authLimiter, uploadLimiter, videoLimiter } from "./middleware/rateLimit";
import { asyncHandler, createError } from "./middleware/errorHandler";
import { publicRoutesMiddleware } from "./middleware/publicRoutes";
import {
  validateBody,
  validateParams,
  idParamSchema,
  statusUpdateSchema,
  shotUpdateSchema,
  videoExportSchema,
  brandKitSchema,
  sanitizeString,
} from "./middleware/validation";
import { z } from "zod";
import { deepSanitize, ensureByteSafe } from "./utils/sanitizeText";
import { utf8Safe } from "./utils/utf8Safe";

import * as supabaseStorage from "./lib/supabaseStorage";
import multer from "multer";
import { randomUUID } from "crypto";
import { handleStripeWebhook, createBillingPortalSession, createCheckoutSession } from "./lib/stripeWebhook";
import { backfillStripeData } from "./lib/stripeSyncEngine";
import { loadUserEntitlement, requirePaidPlan, checkExportLimit, getWatermarkRequired, type SubscriptionRequest } from "./middleware/subscriptionGuard";

// Read version from package.json
let appVersion = "1.0.0";
try {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf-8")
  );
  appVersion = packageJson.version || "1.0.0";
} catch {
  // Fallback if package.json can't be read
}

// Configure multer for clip uploads - use memory storage for Supabase upload
const clipUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (_req, file, cb) => {
    // Accept video files only
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// Track server start time for uptime calculation
const serverStartTime = Date.now();

export async function registerRoutes(app: Express, existingServer?: Server): Promise<Server> {
  // Public routes middleware (must be before auth setup)
  app.use(publicRoutesMiddleware);

  // Health check endpoint (public, no auth required)
  app.get("/api/health", async (_req, res) => {
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    res.json({
      ok: true,
      uptime,
      env: process.env.NODE_ENV || "development",
      version: appVersion,
    });
  });

  // Readiness check endpoint (public, no auth required)
  app.get("/api/ready", async (_req, res) => {
    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Stripe health check endpoint (admin only)
  app.get("/api/stripe/health", requireAuth, asyncHandler(async (req, res) => {
    const subReq = req as unknown as SubscriptionRequest;
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    const userEmail = subReq.user?.email?.toLowerCase();
    
    if (!userEmail || !adminEmails.includes(userEmail)) {
      throw createError("Unauthorized", 403, "ADMIN_REQUIRED");
    }

    // Check database tables exist
    const tableChecks = await Promise.allSettled([
      storage.getRecentStripeEvents(1),
    ]);
    
    // Get recent webhook events
    let recentEvents: any[] = [];
    try {
      recentEvents = await storage.getRecentStripeEvents(10);
    } catch (e) {
      // Table might not exist yet
    }

    // Check Stripe secret exists
    const stripeSecretExists = !!process.env.STRIPE_SECRET_KEY;
    const webhookSecretExists = !!process.env.STRIPE_WEBHOOK_SECRET;

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      config: {
        stripeSecretConfigured: stripeSecretExists,
        webhookSecretConfigured: webhookSecretExists,
        adminEmailsConfigured: adminEmails.length > 0,
      },
      database: {
        stripeEventsLogReady: tableChecks[0].status === "fulfilled",
      },
      recentWebhookEvents: recentEvents.map(e => ({
        eventId: e.event_id,
        type: e.type,
        createdAt: e.created_at,
        processed: e.processed,
      })),
    });
  }));

  // Stripe webhook endpoint (public, uses raw body for signature verification)
  app.post("/api/stripe/webhook", handleStripeWebhook);
  // Alias for simpler webhook URL
  app.post("/api/webhook", handleStripeWebhook);

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many messages. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/contact", contactLimiter, asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      throw createError("Name, email, and message are required", 400, "MISSING_FIELDS");
    }

    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      throw createError("Invalid input types", 400, "INVALID_INPUT");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError("Invalid email address", 400, "INVALID_EMAIL");
    }

    if (subject && typeof subject !== "string") {
      throw createError("Invalid subject type", 400, "INVALID_INPUT");
    }

    if (name.length > 200 || email.length > 200 || message.length > 5000 || (subject && subject.length > 200)) {
      throw createError("Input too long", 400, "INPUT_TOO_LONG");
    }

    const sanitize = (s: string) => s.replace(/[<>&"']/g, "").trim();
    const safeName = sanitize(name);
    const safeEmail = sanitize(email);
    const safeSubject = sanitize(typeof subject === "string" ? subject : "General Inquiry");
    const safeMessage = sanitize(message);

    const nodemailer = await import("nodemailer");
    const gmailUser = process.env.GMAIL_USER || "webform29@gmail.com";
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailPass) {
      console.error("[contact] GMAIL_APP_PASSWORD not configured");
      throw createError("Email service not configured", 500, "EMAIL_NOT_CONFIGURED");
    }

    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: `"Navinta Contact Form" <${gmailUser}>`,
      to: "rushil@navinta.org",
      replyTo: safeEmail,
      subject: `[Navinta Contact] ${safeSubject}`,
      text: `Name: ${safeName}\nEmail: ${safeEmail}\nSubject: ${safeSubject}\n\nMessage:\n${safeMessage}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #135BEC; padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 18px;">New Contact Form Submission</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 8px;"><strong>Name:</strong> ${safeName}</p>
            <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            <p style="margin: 0 0 16px;"><strong>Subject:</strong> ${safeSubject}</p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 16px 0;" />
            <p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>
          </div>
        </div>
      `,
    });

    console.log(`[contact] Email sent from ${safeEmail} - Subject: ${safeSubject}`);
    res.json({ success: true });
  }));

  const WAITLIST_CODE = "NAVINTAAI";

  const waitlistLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/waitlist/join", waitlistLimiter, asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw createError("Name is required", 400, "MISSING_NAME");
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      throw createError("Email is required", 400, "MISSING_EMAIL");
    }
    if (name.trim().length > 200) {
      throw createError("Name is too long", 400, "INPUT_TOO_LONG");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError("Invalid email address", 400, "INVALID_EMAIL");
    }
    const safeName = sanitizeString(name.trim());
    const safeEmail = sanitizeString(email.trim().toLowerCase());
    const entry = await storage.addToWaitlist(safeEmail);
    console.log(`[waitlist] ${safeName} (${safeEmail}) joined (status: ${entry.status})`);

    try {
      const nodemailer = await import("nodemailer");
      const gmailUser = process.env.GMAIL_USER || "webform29@gmail.com";
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      if (gmailPass) {
        const transporter = nodemailer.default.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: { user: gmailUser, pass: gmailPass },
        });
        await transporter.sendMail({
          from: `"Navinta Waitlist" <${gmailUser}>`,
          to: "rushil@navinta.org",
          subject: `${safeName} has entered the waitlist for Navinta`,
          text: `Name: ${safeName}\nEmail: ${safeEmail}`,
          html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <div style="background: #111827; padding: 24px; border-radius: 12px 12px 0 0;">
                <h2 style="color: white; margin: 0; font-size: 18px;">New Waitlist Signup</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="margin: 0 0 8px;"><strong>Name:</strong> ${safeName}</p>
                <p style="margin: 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
              </div>
            </div>
          `,
        });
        console.log(`[waitlist] Notification email sent for ${safeName}`);
      } else {
        console.warn("[waitlist] GMAIL_APP_PASSWORD not set, skipping email notification");
      }
    } catch (emailErr) {
      console.error("[waitlist] Failed to send notification email:", emailErr);
    }

    res.json({ success: true, status: entry.status });
  }));

  app.post("/api/waitlist/redeem", waitlistLimiter, asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      throw createError("Access code is required", 400, "MISSING_CODE");
    }
    if (code.trim().toUpperCase() !== WAITLIST_CODE) {
      throw createError("Invalid access code", 403, "INVALID_CODE");
    }
    res.json({ success: true });
  }));

  // Terms acceptance endpoint (public, tracks legal compliance)
  app.post("/api/terms/accept", asyncHandler(async (req, res) => {
    const { visitorId, privacyPolicyVersion, termsOfServiceVersion } = req.body;
    
    if (!visitorId || !privacyPolicyVersion || !termsOfServiceVersion) {
      throw createError("Missing required fields", 400, "MISSING_FIELDS");
    }

    // Sanitize inputs
    const sanitizedVisitorId = sanitizeString(visitorId);
    const sanitizedPPVersion = sanitizeString(privacyPolicyVersion);
    const sanitizedTOSVersion = sanitizeString(termsOfServiceVersion);
    
    // Get IP address (may be behind proxy)
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || null;
    
    // Get user agent
    const userAgent = req.headers['user-agent'] || null;

    // Store the acceptance record
    const record = await storage.createTermsAcceptance({
      visitorId: sanitizedVisitorId,
      ipAddress,
      userAgent,
      privacyPolicyVersion: sanitizedPPVersion,
      termsOfServiceVersion: sanitizedTOSVersion,
    });

    res.json({
      success: true,
      acceptedAt: record.acceptedAt,
    });
  }));

  // Global auth guard for /api (skips known public routes)
  // Auth runs first, then entitlement loads for authenticated users

  // Stripe checkout session creation (authenticated users only)
  app.post("/api/stripe/create-checkout-session", requireAuth, asyncHandler(async (req: any, res) => {
    console.log("[Stripe] Checkout session requested");
    
    const userId = req.user?.sub;
    const userEmail = req.user?.email;
    
    console.log("[Stripe] User:", userId, userEmail);
    
    if (!userId || !userEmail) {
      console.log("[Stripe] Unauthorized - missing user info");
      throw createError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { plan, interval } = req.body;
    console.log("[Stripe] Plan:", plan, "Interval:", interval);
    
    if (!["starter", "pro", "studio"].includes(plan)) {
      console.log("[Stripe] Invalid plan:", plan);
      throw createError("Invalid plan", 400, "INVALID_PLAN");
    }
    
    if (!["monthly", "yearly"].includes(interval)) {
      console.log("[Stripe] Invalid interval:", interval);
      throw createError("Invalid interval", 400, "INVALID_INTERVAL");
    }

    // Use trusted base URL from environment to prevent host header injection
    let baseUrl: string;
    if (process.env.PUBLIC_URL) {
      baseUrl = process.env.PUBLIC_URL;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    } else {
      baseUrl = `${req.protocol}://${req.get("host")}`;
    }
    
    console.log("[Stripe] Using base URL:", baseUrl);
    
    const sessionUrl = await createCheckoutSession({
      plan: plan as "starter" | "pro" | "studio",
      interval: interval as "monthly" | "yearly",
      userId,
      userEmail,
      successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing`,
    });

    console.log("[Stripe] Session URL:", sessionUrl);
    res.json({ url: sessionUrl });
  }));

  // Alias for simpler checkout URL (also supports priceId directly)
  app.post("/api/create-checkout-session", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user?.sub;
    const userEmail = req.user?.email;
    
    if (!userId || !userEmail) {
      throw createError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { plan, interval, priceId } = req.body;
    
    // Support both plan/interval and direct priceId approaches
    let resolvedPlan = plan;
    let resolvedInterval = interval || "monthly";
    
    if (priceId && !plan) {
      // Map priceId to plan/interval
      const priceMappings: Record<string, { plan: string; interval: string }> = {};
      if (process.env.STRIPE_PRICE_STARTER_MONTHLY) priceMappings[process.env.STRIPE_PRICE_STARTER_MONTHLY] = { plan: "starter", interval: "monthly" };
      if (process.env.STRIPE_PRICE_STARTER_YEARLY) priceMappings[process.env.STRIPE_PRICE_STARTER_YEARLY] = { plan: "starter", interval: "yearly" };
      if (process.env.STRIPE_PRICE_PRO_MONTHLY) priceMappings[process.env.STRIPE_PRICE_PRO_MONTHLY] = { plan: "pro", interval: "monthly" };
      if (process.env.STRIPE_PRICE_PRO_YEARLY) priceMappings[process.env.STRIPE_PRICE_PRO_YEARLY] = { plan: "pro", interval: "yearly" };
      if (process.env.STRIPE_PRICE_STUDIO_MONTHLY) priceMappings[process.env.STRIPE_PRICE_STUDIO_MONTHLY] = { plan: "studio", interval: "monthly" };
      if (process.env.STRIPE_PRICE_STUDIO_YEARLY) priceMappings[process.env.STRIPE_PRICE_STUDIO_YEARLY] = { plan: "studio", interval: "yearly" };
      
      const mapping = priceMappings[priceId];
      if (!mapping) {
        throw createError("Invalid price ID", 400, "INVALID_PRICE_ID");
      }
      resolvedPlan = mapping.plan;
      resolvedInterval = mapping.interval;
    }
    
    if (!["starter", "pro", "studio"].includes(resolvedPlan)) {
      throw createError("Invalid plan", 400, "INVALID_PLAN");
    }
    
    if (!["monthly", "yearly"].includes(resolvedInterval)) {
      throw createError("Invalid interval", 400, "INVALID_INTERVAL");
    }

    let baseUrl: string;
    if (process.env.PUBLIC_URL) {
      baseUrl = process.env.PUBLIC_URL;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    } else {
      baseUrl = `${req.protocol}://${req.get("host")}`;
    }
    
    const sessionUrl = await createCheckoutSession({
      plan: resolvedPlan as "starter" | "pro" | "studio",
      interval: resolvedInterval as "monthly" | "yearly",
      userId,
      userEmail,
      successUrl: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing`,
    });

    res.json({ url: sessionUrl });
  }));

  // Stripe billing portal (authenticated users only)
  app.post("/api/stripe/billing-portal", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user?.sub;
    if (!userId) {
      throw createError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const entitlement = await storage.getUserEntitlement(userId);
    if (!entitlement?.stripeCustomerId) {
      throw createError("No subscription found", 400, "NO_SUBSCRIPTION");
    }

    // Validate returnUrl to prevent open redirects - only allow same-origin paths
    const host = req.get("host") || "";
    const protocol = req.protocol;
    const allowedOrigin = `${protocol}://${host}`;
    let returnUrl = req.body.returnUrl || "/dashboard";
    
    // If returnUrl is absolute, ensure it matches our origin
    if (returnUrl.startsWith("http://") || returnUrl.startsWith("https://")) {
      try {
        const url = new URL(returnUrl);
        if (url.origin !== allowedOrigin) {
          returnUrl = "/dashboard"; // Fallback to safe default
        }
      } catch {
        returnUrl = "/dashboard";
      }
    } else if (!returnUrl.startsWith("/")) {
      returnUrl = "/dashboard";
    }
    
    const fullReturnUrl = returnUrl.startsWith("/") ? `${allowedOrigin}${returnUrl}` : returnUrl;
    const portalUrl = await createBillingPortalSession(entitlement.stripeCustomerId, fullReturnUrl);
    
    console.log(`[Stripe] Billing portal created for user ${userId}`);
    res.json({ url: portalUrl });
  }));

  // Stripe data backfill endpoint (admin only)
  app.post("/api/stripe/backfill", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user?.sub;
    const userEmail = req.user?.email;
    
    // Admin authorization check - only specific admin emails can trigger backfill
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    const isAdmin = userEmail && adminEmails.includes(userEmail.toLowerCase());
    
    if (!isAdmin) {
      console.warn(`[Stripe Sync] Unauthorized backfill attempt by user ${userId} (${userEmail})`);
      throw createError("Admin access required", 403, "FORBIDDEN");
    }

    const { object = "all" } = req.body;
    const validObjects = ["customer", "product", "price", "subscription", "invoice", "charge", "all"];
    
    if (!validObjects.includes(object)) {
      throw createError("Invalid object type", 400, "INVALID_OBJECT");
    }

    console.log(`[Stripe Sync] Admin ${userEmail} starting backfill for: ${object}`);
    await backfillStripeData(object);
    
    res.json({ 
      success: true, 
      message: `Backfill completed for: ${object}` 
    });
  }));

  // Get user entitlement/subscription status (also auto-creates free entitlement if missing)
  app.get("/api/subscription", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user?.sub;
    const userEmail = req.user?.email;
    if (!userId) {
      throw createError("Unauthorized", 401, "UNAUTHORIZED");
    }

    let entitlement = await storage.getUserEntitlement(userId);
    
    // Check for pending entitlement by email (Stripe webhook created before user logged in)
    if (!entitlement && userEmail) {
      console.log(`[Billing] Checking for pending entitlement for ${userEmail}`);
      const claimed = await storage.claimPendingEntitlement(userId, userEmail);
      if (claimed) {
        console.log(`[Billing] Claimed pending entitlement for ${userEmail}`);
        entitlement = claimed;
      }
    }
    
    // Auto-create free entitlement if missing
    if (!entitlement) {
      console.log(`[Billing] Creating free entitlement for user ${userId}`);
      entitlement = await storage.createUserEntitlement({
        userId,
        plan: "free",
        status: "active",
        watermarkRequired: true,
        aiBroll: false,
        aiVoice: false,
        maxExports: 3,
        exportsUsedToday: 0,
        exportAllowed: true,
      });
    }
    
    // Auto-repair broken free tier entitlements
    // If user is on free plan but has exportAllowed=false (from failed payment attempt),
    // reset them to working free tier with exports enabled
    if (entitlement && entitlement.plan === "free" && !entitlement.exportAllowed) {
      console.log(`[Billing] Auto-repairing broken free tier entitlement for ${userId}`);
      await storage.upsertUserEntitlement(userId, {
        status: "active",
        exportAllowed: true,
        watermarkRequired: true,
        maxExports: 3,
      });
      entitlement = await storage.getUserEntitlement(userId);
    }

    if (!entitlement) {
      res.json({
        plan: "free",
        status: "active",
        watermarkRequired: true,
        aiBroll: false,
        aiVoice: false,
        maxExports: 3,
        exportsUsedToday: 0,
        exportAllowed: true,
      });
      return;
    }

    res.json({
      plan: entitlement.plan,
      status: entitlement.status,
      watermarkRequired: entitlement.watermarkRequired,
      aiBroll: entitlement.aiBroll,
      aiVoice: entitlement.aiVoice,
      maxExports: entitlement.maxExports,
      exportsUsedToday: entitlement.exportsUsedToday,
      exportAllowed: entitlement.exportAllowed,
      currentPeriodEnd: entitlement.currentPeriodEnd,
      stripeCustomerId: entitlement.stripeCustomerId,
      cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd || false,
      billingInterval: entitlement.billingInterval || null,
    });
  }));

  // Sync subscription from Stripe (rescue path if webhook failed)
  app.post("/api/subscription/sync", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user?.sub;
    if (!userId) {
      throw createError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const entitlement = await storage.getUserEntitlement(userId);
    if (!entitlement?.stripeCustomerId) {
      throw createError("No Stripe customer found", 400, "NO_CUSTOMER");
    }

    // Import Stripe and fetch subscription
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

    try {
      // List subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: entitlement.stripeCustomerId,
        status: "all",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        // No subscription - ensure user is on free plan
        await storage.upsertUserEntitlement(userId, {
          plan: "free",
          status: "active",
          watermarkRequired: true,
          aiBroll: false,
          aiVoice: false,
          maxExports: 3,
          exportAllowed: true,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        });
        res.json({ synced: true, plan: "free", message: "No active subscription found" });
        return;
      }

      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0]?.price.id;
      
      if (!priceId) {
        throw createError("Subscription has no price ID", 500, "NO_PRICE_ID");
      }
      
      // Map price ID to plan - only include valid mappings
      const priceMappings: Record<string, string> = {};
      if (process.env.STRIPE_PRICE_STARTER_MONTHLY) priceMappings[process.env.STRIPE_PRICE_STARTER_MONTHLY] = "starter";
      if (process.env.STRIPE_PRICE_STARTER_YEARLY) priceMappings[process.env.STRIPE_PRICE_STARTER_YEARLY] = "starter";
      if (process.env.STRIPE_PRICE_PRO_MONTHLY) priceMappings[process.env.STRIPE_PRICE_PRO_MONTHLY] = "pro";
      if (process.env.STRIPE_PRICE_PRO_YEARLY) priceMappings[process.env.STRIPE_PRICE_PRO_YEARLY] = "pro";
      if (process.env.STRIPE_PRICE_STUDIO_MONTHLY) priceMappings[process.env.STRIPE_PRICE_STUDIO_MONTHLY] = "studio";
      if (process.env.STRIPE_PRICE_STUDIO_YEARLY) priceMappings[process.env.STRIPE_PRICE_STUDIO_YEARLY] = "studio";
      
      const plan = priceMappings[priceId];
      
      if (!plan) {
        console.warn(`[Billing] Unknown price ID ${priceId} - cannot determine plan. Check STRIPE_PRICE_* env vars.`);
        throw createError(`Unknown price ID: ${priceId}. Please contact support.`, 400, "UNKNOWN_PRICE");
      }

      const PLAN_FEATURES: Record<string, any> = {
        free: { watermarkRequired: true, aiBroll: false, aiVoice: false, maxExports: 3 },
        starter: { watermarkRequired: false, aiBroll: true, aiVoice: false, maxExports: 20 },
        pro: { watermarkRequired: false, aiBroll: true, aiVoice: true, maxExports: 100 },
        studio: { watermarkRequired: false, aiBroll: true, aiVoice: true, maxExports: -1 },
      };
      const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

      const status = subscription.status === "active" ? "active" :
                     subscription.status === "past_due" ? "past_due" :
                     subscription.status === "canceled" ? "canceled" :
                     subscription.status === "trialing" ? "trialing" : "active";

      const syncInterval = subscription.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly";
      const syncCancelAtPeriodEnd = subscription.cancel_at_period_end || false;

      await storage.upsertUserEntitlement(userId, {
        plan,
        status,
        stripeSubscriptionId: subscription.id,
        watermarkRequired: features.watermarkRequired,
        aiBroll: features.aiBroll,
        aiVoice: features.aiVoice,
        maxExports: features.maxExports,
        exportAllowed: status === "active" || status === "trialing",
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: syncCancelAtPeriodEnd,
        billingInterval: syncInterval,
      });

      console.log(`[Billing] Synced subscription for user ${userId}: ${plan} (${status}, ${syncInterval}, cancelAtPeriodEnd=${syncCancelAtPeriodEnd})`);
      res.json({ synced: true, plan, status, message: "Subscription synced successfully" });
    } catch (error: any) {
      console.error(`[Billing] Sync error for user ${userId}:`, error);
      throw createError("Failed to sync subscription", 500, "SYNC_FAILED");
    }
  }));

  // Global auth guard for /api (skips known public routes), then load entitlements
  app.use("/api", (req, res, next) => {
    if ((req as any).isPublicRoute) return next();
    return requireAuth(req as any, res, next);
  });
  app.use("/api", loadUserEntitlement as any);

  // Get current user from Supabase session
  app.get('/api/auth/user', requireAuth, asyncHandler(async (req: any, res) => {
    const authUser = req.user;
    if (!authUser?.sub) {
      throw createError("Unauthorized", 401, "UNAUTHORIZED");
    }
    
    // Get or create user in our database
    let user = await storage.getUser(authUser.sub);
    if (!user) {
      // Create user record from Supabase auth data
      await storage.upsertUser({
        id: authUser.sub,
        email: authUser.email || null,
        firstName: authUser.firstName || null,
        lastName: authUser.lastName || null,
        profileImageUrl: null,
      });
      user = await storage.getUser(authUser.sub);
    }
    
    res.json(user);
  }));

  // Delete user account and all associated data
  app.delete('/api/auth/account', requireAuth, asyncHandler(async (req: any, res) => {
    const authUser = req.user;
    if (!authUser?.sub) {
      throw createError("Unauthorized", 401, "UNAUTHORIZED");
    }
    
    const userId = authUser.sub;
    console.log(`[delete-account] Deleting account for user: ${userId}`);
    
    try {
      await storage.deleteUser(userId);
      console.log(`[delete-account] Successfully deleted user: ${userId}`);
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error: any) {
      console.error(`[delete-account] Failed to delete user: ${userId}`, error);
      throw createError("Failed to delete account", 500, "DELETE_FAILED");
    }
  }));


  // Apply edited content plan
  app.post("/api/content-plan/:contentPlanId/apply-edit", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { contentPlanId } = req.params;
    const { editedPlan } = req.body;
    
    if (!editedPlan || !editedPlan.posts) {
      throw createError("Edited plan is required", 400);
    }
    
    console.log(`[apply-edit] User ${userId} applying edits to plan ${contentPlanId}`);
    
    // Get the current content plan
    const projects = await storage.getProjects(userId);
    if (projects.length === 0) {
      throw createError("No project found", 404);
    }
    
    const project = projects[0];
    const contentPlan = await storage.getContentPlan(project.id, userId);
    
    if (!contentPlan || contentPlan.id !== contentPlanId) {
      throw createError("Content plan not found", 404);
    }
    
    // Delete existing posts and create new ones
    const existingPosts = await storage.getPosts(project.id, userId);
    for (const post of existingPosts) {
      await storage.deletePost(post.id, userId);
    }
    
    // Create new posts from edited plan
    for (const postData of editedPlan.posts) {
      const safePost = deepSanitize(postData);
      await storage.createPost({
        projectId: project.id,
        contentPlanId: contentPlan.id,
        userId,
        weekNumber: safePost.weekNumber,
        dayNumber: safePost.dayNumber,
        title: ensureByteSafe(safePost.title),
        concept: ensureByteSafe(safePost.concept),
        platform: safePost.platform,
        shotList: safePost.shotList,
        brollSuggestions: safePost.brollSuggestions,
        caption: ensureByteSafe(safePost.caption),
        hashtags: safePost.hashtags,
        musicVibe: safePost.musicVibe,
        status: "planned",
        scheduledFor: null,
      });
    }
    
    console.log(`[apply-edit] Created ${editedPlan.posts.length} posts`);
    
    res.json({ success: true, postCount: editedPlan.posts.length });
  }));

  // Debug endpoint to check user data
  app.get("/api/debug/user-data", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const projects = await storage.getProjects(userId);
      const plans = [];
      const allPosts = [];
      
      for (const project of projects) {
        const plan = await storage.getContentPlan(project.id, userId);
        if (plan) plans.push(plan);
        const posts = await storage.getPosts(project.id, userId);
        allPosts.push(...posts);
      }
      
      res.json({
        userId,
        projectCount: projects.length,
        projects: projects.map(p => ({ id: p.id, name: p.name, userId: p.userId })),
        planCount: plans.length,
        postCount: allPosts.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get content plan with posts
  app.get("/api/content-plan", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      console.log(`[content-plan] Fetching for userId: ${userId}`);
      
      // Get user's projects
      const projects = await storage.getProjects(userId);
      console.log(`[content-plan] Found ${projects.length} projects`);
      if (projects.length === 0) {
        console.log(`[content-plan] No projects found, returning null`);
        return res.json(null);
      }
      
      // Find a project that has a content plan (check most recent first)
      let plan = null;
      let projectWithPlan = null;
      
      // Sort by createdAt descending (most recent first)
      const sortedProjects = [...projects].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      for (const project of sortedProjects) {
        const projectPlan = await storage.getContentPlan(project.id, userId);
        if (projectPlan) {
          plan = projectPlan;
          projectWithPlan = project;
          console.log(`[content-plan] Found plan ${plan.id} for project ${project.id}`);
          break;
        }
      }
      
      if (!plan || !projectWithPlan) {
        console.log(`[content-plan] No plan found in any of ${projects.length} projects, returning null`);
        return res.json(null);
      }
      
      // Include posts in the response
      const posts = await storage.getPosts(projectWithPlan.id, userId);
      console.log(`[content-plan] Posts found: ${posts.length} for project ${projectWithPlan.id}`);
      res.json({
        ...plan,
        posts: posts,
      });
    } catch (error: any) {
      console.error(`[content-plan] Error:`, error.message, error.stack);
      res.status(500).json({ error: "Failed to fetch content plan" });
    }
  });

  // Get all posts
  app.get("/api/posts", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      
      // Get user's projects
      const projects = await storage.getProjects(userId);
      if (projects.length === 0) {
        return res.json([]);
      }
      
      // Find the most recent project that has a content plan
      const sortedProjects = [...projects].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      for (const project of sortedProjects) {
        const plan = await storage.getContentPlan(project.id, userId);
        if (plan) {
          const posts = await storage.getPosts(project.id, userId);
          return res.json(posts);
        }
      }
      
      return res.json([]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Get single post
  app.get("/api/posts/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const post = await storage.getPost(req.params.id, userId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  // Update post shot completion
  app.patch("/api/posts/:postId/shots/:shotId", requireAuth, validateBody(shotUpdateSchema), asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { completed } = req.body;
    const post = await storage.updatePostShot(
      sanitizeString(req.params.postId),
      sanitizeString(req.params.shotId),
      userId,
      completed
    );
    res.json(post);
  }));

  // Update post status
  app.patch("/api/posts/:id/status", requireAuth, validateBody(statusUpdateSchema), asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { status } = req.body;
    const post = await storage.updatePostStatus(sanitizeString(req.params.id), userId, status);
    res.json(post);
  }));

  app.post("/api/posts/:id/regenerate-script", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const postId = sanitizeString(req.params.id);
    const { hookStyle } = req.body || {};

    const post = await storage.getPost(postId, userId);
    if (!post) throw createError("Post not found", 404);

    const projects = await storage.getProjects(userId);
    if (projects.length === 0) throw createError("No project found", 404);
    const project = projects[0];
    const contentPlan = await storage.getContentPlan(project.id, userId);

    const scriptResult = await generateViralScript({
      brandName: project.name,
      brandDescription: project.description || "",
      creatorType: contentPlan?.businessType || "creator",
      audienceDescription: contentPlan?.targetAudience || "",
      contentGoal: (contentPlan?.contentGoals as string[])?.[0] || "authority",
      brandPersonality: contentPlan?.tone || "professional",
      platform: post.platform,
      hookStyle: hookStyle as HookStyle | undefined,
      videoTitle: post.title,
      videoConcept: post.concept,
      targetDurationSec: (post.shotList as any[])?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || 30,
    });

    const newShotList = scriptToShotDialogue(
      scriptResult.script,
      (post.shotList as any[])?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || 30
    );
    const teleprompterCards = scriptToTeleprompterCards(scriptResult.script);

    const updatedPost = await storage.updatePostShots(postId, userId, newShotList);

    res.json({
      post: updatedPost,
      scriptStructure: scriptResult.script,
      score: scriptResult.score,
      teleprompterCards,
      attempts: scriptResult.attempts,
    });
  }));

  app.get("/api/posts/:id/teleprompter", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const postId = sanitizeString(req.params.id);

    const post = await storage.getPost(postId, userId);
    if (!post) throw createError("Post not found", 404);

    const shotList = post.shotList as any[];
    const fullScript = shotList.map((s: any) => s.dialogue).filter(Boolean).join(" ");
    const totalDuration = shotList.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

    const words = fullScript.split(/\s+/).filter((w: string) => w.length > 0);
    const MAX_WORDS_PER_CARD = 14;
    const cards: Array<{ text: string; durationSec: number; beatType: string }> = [];

    for (let i = 0; i < words.length; i += MAX_WORDS_PER_CARD) {
      const chunk = words.slice(i, i + MAX_WORDS_PER_CARD).join(" ");
      const chunkWordRatio = Math.min(MAX_WORDS_PER_CARD, words.length - i) / words.length;
      cards.push({
        text: chunk,
        durationSec: Math.round(totalDuration * chunkWordRatio * 10) / 10,
        beatType: i === 0 ? "hook" : i + MAX_WORDS_PER_CARD >= words.length ? "payoff" : "body",
      });
    }

    res.json({
      cards,
      fullScript,
      totalDuration,
      wordCount: words.length,
    });
  }));

  app.get("/api/hook-styles", (_req, res) => {
    res.json(HOOK_STYLES);
  });

  // Get brand kit
  app.get("/api/brand-kit", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      
      // Get user's default project
      const projects = await storage.getProjects(userId);
      if (projects.length === 0) {
        return res.json(null);
      }
      const defaultProject = projects[0];
      
      const brandKit = await storage.getBrandKit(defaultProject.id, userId);
      res.json(brandKit || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brand kit" });
    }
  });

  // Create/update brand kit
  app.post("/api/brand-kit", requireAuth, validateBody(brandKitSchema), asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    
    // Get user's default project
    const projects = await storage.getProjects(userId);
    if (projects.length === 0) {
      throw createError("No project found. Please complete onboarding first.", 400, "NO_PROJECT");
    }
    const defaultProject = projects[0];
    
    const brandKit = await storage.createOrUpdateBrandKit({
      ...req.body,
      projectId: defaultProject.id,
      userId,
    });
    res.json(brandKit);
  }));

  // Get all clips - ultra-robust, never crashes, always returns valid JSON
  app.get("/api/clips", async (req: any, res) => {
    // Set JSON content type immediately to ensure proper response format
    res.setHeader('Content-Type', 'application/json');
    
    console.log(`[clips] ===== GET /api/clips START =====`);
    
    try {
      // 0. Manual auth check (inline to avoid middleware issues)
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      
      if (!token) {
        console.log(`[clips] No token provided`);
        return res.status(401).json({ error: "Authentication required", clips: [] });
      }
      
      // Verify token with Supabase
      const { getSupabaseAdmin } = await import("./lib/supabase");
      const supabase = getSupabaseAdmin();
      
      if (!supabase) {
        console.error(`[clips] Supabase not configured`);
        return res.status(503).json({ error: "Auth service unavailable", clips: [] });
      }
      
      let userId: string;
      let userEmail: string | null = null;
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          console.log(`[clips] Token verification failed:`, error?.message || "No user");
          return res.status(401).json({ error: "Invalid or expired token", clips: [] });
        }
        userId = user.id;
        userEmail = user.email ?? null;
      } catch (authError: any) {
        console.error(`[clips] Auth verification error:`, authError.message);
        return res.status(401).json({ error: "Authentication failed", clips: [] });
      }
      
      console.log(`[clips] User ID from token: ${userId}`);
      console.log(`[clips] User email: ${userEmail || 'N/A'}`);
      
      // 1. Validate storage is initialized
      if (!storage) {
        console.error(`[clips] ERROR: Storage not initialized`);
        return res.status(503).json({ error: "Storage service unavailable", clips: [] });
      }
      
      // 2. Query clips with detailed logging
      console.log(`[clips] Executing query: getClips(${userId})`);
      let clips: any[] = [];
      try {
        clips = await storage.getClips(userId);
      } catch (dbError: any) {
        console.error(`[clips] DATABASE ERROR:`, dbError.message);
        console.error(`[clips] Database error stack:`, dbError.stack);
        return res.status(500).json({ 
          error: "Database query failed",
          message: dbError.message,
          clips: [] 
        });
      }
      
      // 3. Log query results
      console.log(`[clips] Query completed. Found ${clips?.length || 0} clips for user ${userId}`);
      
      // 4. Handle null/undefined result (return empty array)
      if (!clips || !Array.isArray(clips)) {
        console.log(`[clips] No clips found or invalid result, returning empty array`);
        return res.status(200).json([]);
      }
      
      if (clips.length > 0) {
        console.log(`[clips] First clip:`, JSON.stringify({ 
          id: clips[0].id, 
          userId: clips[0].userId, 
          postId: clips[0].postId,
          hasVideoPath: !!clips[0].videoPath 
        }));
      }
      
      // 5. Pagination
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;
      const totalCount = clips.length;
      const paginatedClips = clips.slice(offset, offset + limit);

      // 6. Generate signed URLs with batched concurrency (5 at a time)
      let clipsWithUrls: any[];
      try {
        const BATCH_SIZE = 5;
        clipsWithUrls = [];
        for (let i = 0; i < paginatedClips.length; i += BATCH_SIZE) {
          const batch = paginatedClips.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (clip) => {
              let signedUrl: string | null = null;
              if (clip.videoPath) {
                try {
                  signedUrl = await getClipSignedUrl(clip.videoPath);
                } catch (err: any) {
                  console.error(`[clips] Failed to get signed URL for clip ${clip.id}:`, err.message);
                }
              }
              return { ...clip, signedUrl };
            })
          );
          clipsWithUrls.push(...batchResults);
        }
      } catch (urlError: any) {
        console.error(`[clips] Error generating signed URLs:`, urlError.message);
        clipsWithUrls = paginatedClips.map(clip => ({ ...clip, signedUrl: null }));
      }
      
      console.log(`[clips] ===== GET /api/clips SUCCESS: ${clipsWithUrls.length} clips =====`);
      return res.status(200).json(clipsWithUrls);
      
    } catch (error: any) {
      // Catch-all for any unexpected errors
      console.error(`[clips] UNEXPECTED ERROR:`, error?.message || 'Unknown');
      console.error(`[clips] Error stack:`, error?.stack || 'No stack');
      
      // Ensure we always return valid JSON
      try {
        return res.status(500).json({ 
          error: "An unexpected error occurred",
          message: String(error?.message || "Unknown error"),
          clips: [] 
        });
      } catch (jsonError) {
        // Last resort - send plain text if JSON fails
        console.error(`[clips] Failed to send JSON error response`);
        res.status(500).send('{"error":"Internal server error","clips":[]}');
      }
    }
  });

  // Debug endpoint to check clips for a post
  app.get("/api/debug/clips/:postId", requireAuth, async (req: any, res) => {
    try {
      const clips = await storage.getClipsByPost(req.params.postId);
      res.json({
        postId: req.params.postId,
        clipCount: clips.length,
        clips: clips.map(c => ({
          id: c.id,
          shotId: c.shotId,
          duration: c.duration,
          hasVideoData: !!c.videoData && c.videoData.length > 0,
          videoDataLength: c.videoData?.length || 0,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to check user's clips with full details
  app.get("/api/debug/my-clips", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const userEmail = req.user.email;
      const clips = await storage.getClips(userId);
      
      console.log(`[debug/my-clips] User ID: ${userId}, Email: ${userEmail}, Clips: ${clips.length}`);
      
      res.json({
        userId,
        userEmail,
        clipCount: clips.length,
        clips: clips.map(c => ({
          id: c.id,
          userId: c.userId,
          postId: c.postId,
          shotId: c.shotId,
          duration: c.duration,
          hasVideoPath: !!c.videoPath,
          videoPath: c.videoPath,
          recordedAt: c.recordedAt,
        })),
      });
    } catch (error: any) {
      console.error(`[debug/my-clips] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload clip with file (multipart FormData) - uploads to Supabase Storage
  app.post("/api/clips/upload", requireAuth, uploadLimiter, clipUpload.single("video"), async (req: any, res) => {
    try {
      const authUser = req.user;
      const userId = authUser.sub;
      const file = req.file as Express.Multer.File;
      
      console.log(`[clips/upload] ===== UPLOADING CLIP =====`);
      console.log(`[clips/upload] userId: ${userId}`);
      console.log(`[clips/upload] postId: ${req.body.postId}, shotId: ${req.body.shotId}`);
      console.log(`[clips/upload] File: ${file?.originalname}, size: ${file?.size}, mimetype: ${file?.mimetype}`);
      
      if (!file || !file.buffer) {
        return res.status(400).json({ error: "No video file uploaded" });
      }
      
      if (file.buffer.length === 0) {
        return res.status(400).json({ error: "Empty video file" });
      }
      
      // Check if Supabase Storage is available
      if (!isStorageAvailable()) {
        console.error("[clips/upload] Supabase Storage not available");
        return res.status(503).json({ error: "Storage service unavailable" });
      }
      
      // Ensure user exists in database
      let user = await storage.getUser(userId);
      if (!user) {
        console.log(`[clips/upload] Creating user record for: ${userId}`);
        await storage.upsertUser({
          id: userId,
          email: authUser.email || null,
          firstName: authUser.firstName || null,
          lastName: authUser.lastName || null,
          profileImageUrl: null,
        });
      }
      
      // Upload directly to Supabase Storage
      console.log(`[clips/upload] Uploading to Supabase Storage...`);
      let storagePath: string;
      try {
        const uploadResult = await uploadClipToStorage(
          file.buffer,
          userId,
          file.mimetype
        );
        storagePath = uploadResult.path;
        console.log(`[clips/upload] Uploaded to storage: ${storagePath}`);
      } catch (uploadError: any) {
        console.error(`[clips/upload] Storage upload failed:`, uploadError.message);
        return res.status(500).json({ 
          error: "Storage upload failed", 
          message: uploadError.message 
        });
      }
      
      // Create clip record with storage path (not base64)
      const clipData = {
        postId: req.body.postId || null,
        userId,
        shotId: req.body.shotId || null,
        duration: parseInt(req.body.duration) || 0,
        videoPath: storagePath, // NEW: Supabase Storage path
        videoData: null, // DEPRECATED: no longer storing video data in DB
        filename: file.originalname,
      };
      
      const clip = await storage.createClip(clipData);
      console.log(`[clips/upload] ===== CLIP SAVED SUCCESSFULLY =====`);
      console.log(`[clips/upload] Clip ID: ${clip.id}`);
      console.log(`[clips/upload] User ID: ${clip.userId}`);
      console.log(`[clips/upload] Post ID: ${clip.postId}`);
      console.log(`[clips/upload] Shot ID: ${clip.shotId}`);
      console.log(`[clips/upload] Duration: ${clip.duration}`);
      console.log(`[clips/upload] Video Path: ${clip.videoPath}`);
      console.log(`[clips/upload] Recorded At: ${clip.recordedAt}`);
      res.json(clip);
    } catch (error: any) {
      console.error("[clips/upload] Error:", error);
      res.status(500).json({ 
        error: "Failed to save clip",
        message: error.message 
      });
    }
  });

  // Create clip (uploads video data) - legacy base64 method
  app.post("/api/clips", requireAuth, uploadLimiter, async (req: any, res) => {
    try {
      const authUser = req.user;
      const userId = authUser.sub;
      console.log(`[clips] ===== SAVING CLIP =====`);
      console.log(`[clips] userId from token: ${userId}`);
      console.log(`[clips] postId: ${req.body.postId}, shotId: ${req.body.shotId}`);
      console.log(`[clips] videoData length: ${req.body.videoData?.length || 0}, duration: ${req.body.duration}`);
      
      // Ensure user exists in database (required for foreign key constraints)
      let user = await storage.getUser(userId);
      if (!user) {
        console.log(`[clips] Creating user record for: ${userId}`);
        await storage.upsertUser({
          id: userId,
          email: authUser.email || null,
          firstName: authUser.firstName || null,
          lastName: authUser.lastName || null,
          profileImageUrl: null,
        });
        console.log(`[clips] User created: ${userId}`);
      }
      
      // Validate required fields
      const validation = insertClipSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validation.success) {
        console.error(`[clips] Validation failed:`, validation.error.format());
        return res.status(400).json({ 
          error: "Invalid clip data", 
          details: validation.error.format() 
        });
      }
      
      console.log(`[clips] Validation passed, saving to DB...`);
      const clip = await storage.createClip(validation.data);
      console.log(`[clips] Clip saved with id: ${clip.id}`);
      res.json(clip);
    } catch (error: any) {
      console.error("[clips] Error saving clip:", error);
      res.status(500).json({ 
        error: "Failed to save clip",
        message: error.message 
      });
    }
  });

  // Delete clip
  app.delete("/api/clips/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      await storage.deleteClip(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete clip error:", error);
      if (error.message.includes("not found") || error.message.includes("Unauthorized")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete clip" });
      }
    }
  });

  // Get signed URL for clip video playback
  app.get("/api/clips/:id/video", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const clip = await storage.getClip(req.params.id, userId);
      
      if (!clip) {
        return res.status(404).json({ error: "Clip not found" });
      }
      
      // NEW: If clip has videoPath (Supabase Storage), return signed URL
      if (clip.videoPath) {
        console.log(`[clips/video] Getting signed URL for: ${clip.videoPath}`);
        try {
          const signedUrl = await getClipSignedUrl(clip.videoPath);
          // Redirect to signed URL for playback
          return res.redirect(signedUrl);
        } catch (urlError: any) {
          console.error(`[clips/video] Failed to get signed URL:`, urlError.message);
          return res.status(500).json({ error: "Failed to get video URL" });
        }
      }
      
      // LEGACY: Handle old videoData (file path or base64)
      if (!clip.videoData) {
        return res.status(404).json({ error: "No video data" });
      }
      
      // If it's a file path (not starting with 'data:'), serve the file
      if (!clip.videoData.startsWith('data:')) {
        const filePath = join(process.cwd(), clip.videoData);
        console.log(`[clips/video] Serving legacy file: ${filePath}`);
        
        try {
          await fs.access(filePath);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          const fileStream = require('fs').createReadStream(filePath);
          fileStream.pipe(res);
        } catch {
          console.error(`[clips/video] File not found: ${filePath}`);
          return res.status(404).json({ error: "Video file not found" });
        }
      } else {
        // Legacy: decode base64 and send (for backward compatibility)
        console.log(`[clips/video] Serving legacy base64 video`);
        const match = clip.videoData.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return res.status(400).json({ error: "Invalid video data format" });
        }
        
        const mimeType = match[1];
        const base64Content = match[2];
        const buffer = Buffer.from(base64Content, 'base64');
        
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
      }
    } catch (error: any) {
      console.error("[clips/video] Error:", error);
      res.status(500).json({ error: "Failed to serve clip video" });
    }
  });
  
  // Get signed URL for clip (for frontend to use directly)
  app.get("/api/clips/:id/url", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const clip = await storage.getClip(req.params.id, userId);
      
      if (!clip) {
        return res.status(404).json({ error: "Clip not found" });
      }
      
      if (!clip.videoPath) {
        // Legacy clip - return API endpoint URL
        return res.json({ url: `/api/clips/${clip.id}/video` });
      }
      
      const signedUrl = await getClipSignedUrl(clip.videoPath);
      res.json({ url: signedUrl });
    } catch (error: any) {
      console.error("[clips/url] Error:", error);
      res.status(500).json({ error: "Failed to get video URL" });
    }
  });

  // ==========================================
  // Recording Sessions (Record with Phone / QR)
  // ==========================================

  const sessionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: "Too many recording sessions created. Try again in a minute." },
    validate: false,
  });

  app.post("/api/recording-sessions", requireAuth, sessionLimiter, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { postId, shotId } = req.body;

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    const post = await storage.getPost(postId, userId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const { randomUUID } = await import("crypto");
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const session = await storage.createRecordingSession({
      userId,
      postId,
      shotId: shotId || null,
      status: "pending",
      sessionToken,
      expiresAt,
    });

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const pairUrl = `${protocol}://${host}/record/phone?sid=${session.id}&token=${sessionToken}`;

    res.json({ sessionId: session.id, pairUrl, expiresAt: session.expiresAt });
  }));

  app.get("/api/recording-sessions/:sid", async (req: any, res) => {
    try {
      const session = await storage.getRecordingSession(req.params.sid);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (new Date() > new Date(session.expiresAt) && session.status !== "uploaded") {
        return res.status(410).json({ error: "Session expired" });
      }

      const authHeader = req.headers.authorization;
      if (authHeader) {
        res.json(session);
      } else {
        res.json({
          id: session.id,
          postId: session.postId,
          shotId: session.shotId,
          status: session.status,
          expiresAt: session.expiresAt,
        });
      }
    } catch (error: any) {
      console.error("[recording-sessions] Error:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  app.get("/api/recording-sessions/:sid/upload-url", async (req: any, res) => {
    try {
      const session = await storage.getRecordingSession(req.params.sid);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const token = req.query.token as string;
      if (!token || token !== session.sessionToken) {
        return res.status(403).json({ error: "Invalid session token" });
      }

      if (new Date() > new Date(session.expiresAt)) {
        return res.status(410).json({ error: "Session expired" });
      }

      if (session.status === "uploaded") {
        return res.status(400).json({ error: "Session already completed" });
      }

      if (!isStorageAvailable()) {
        return res.status(503).json({ error: "Storage not available" });
      }

      const { uploadUrl, storagePath } = await createSignedUploadUrl(session.userId);

      await storage.updateRecordingSession(session.id, {
        status: "paired",
        storagePath,
      });

      res.json({ uploadUrl, storagePath });
    } catch (error: any) {
      console.error("[recording-sessions/upload-url] Error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  const completionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Too many requests." },
    validate: false,
  });

  app.post("/api/recording-sessions/:sid/complete", completionLimiter, asyncHandler(async (req: any, res) => {
    const session = await storage.getRecordingSession(req.params.sid);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const { storagePath, duration, mimeType, token } = req.body;

    if (!token || token !== session.sessionToken) {
      return res.status(403).json({ error: "Invalid session token" });
    }

    if (new Date() > new Date(session.expiresAt) && session.status !== "paired") {
      return res.status(410).json({ error: "Session expired" });
    }

    if (session.status === "uploaded") {
      return res.status(400).json({ error: "Session already completed" });
    }

    if (!storagePath || !storagePath.startsWith(session.userId + "/")) {
      return res.status(400).json({ error: "Invalid storage path" });
    }

    let user = await storage.getUser(session.userId);
    if (!user) {
      await storage.upsertUser({ id: session.userId, email: null });
    }

    const clip = await storage.createClip({
      postId: session.postId,
      userId: session.userId,
      shotId: session.shotId,
      videoPath: storagePath,
      duration: duration || 0,
      recordedAt: new Date(),
    });

    await storage.updateRecordingSession(session.id, {
      status: "uploaded",
      clipId: clip.id,
      storagePath,
      duration: duration || 0,
      mimeType: mimeType || "video/webm",
    });

    res.json({ clip, session: { id: session.id, status: "uploaded" } });
  }));

  app.delete("/api/recording-sessions/:sid", requireAuth, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const session = await storage.getRecordingSession(req.params.sid);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await storage.updateRecordingSession(session.id, { status: "cancelled" });
    res.json({ success: true });
  }));

  // Get all videos
  app.get("/api/videos", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const postId = req.query.postId as string | undefined;
      const videos = await storage.getVideos(userId, postId);
      
      // Generate signed URLs for videos with videoPath
      const videosWithUrls = await Promise.all(
        videos.map(async (video) => {
          let signedUrl: string | null = null;
          if (video.videoPath) {
            try {
              signedUrl = await getVideoSignedUrl(video.videoPath);
            } catch (err) {
              console.error(`[videos] Failed to get signed URL for video ${video.id}:`, err);
            }
          }
          return { ...video, signedUrl };
        })
      );
      
      res.json(videosWithUrls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  // Export video (subscription gated) - video processing removed
  app.post("/api/videos/export", requireAuth, uploadLimiter, checkExportLimit as any, validateBody(videoExportSchema), async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const { postId, hasCaption, musicStyle } = req.body;
      console.log(`[video-export] Starting for postId: ${postId}, userId: ${userId}`);

      // Get post for title
      const post = await storage.getPost(postId, userId);
      if (!post) {
        console.log(`[video-export] Post not found: ${postId}`);
        return res.status(404).json({ error: "Post not found", code: "POST_NOT_FOUND" });
      }
      console.log(`[video-export] Post found: ${post.title}`);

      // Get clips for this post
      const clips = await storage.getClipsByPost(postId);
      console.log(`[video-export] Clips found: ${clips.length}`);
      if (clips.length === 0) {
        return res.status(400).json({ error: "No clips found for this post. Please record and save at least one shot.", code: "NO_CLIPS_FOUND" });
      }

      const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
      console.log(`[video-export] Total duration: ${totalDuration}s`);

      // Create video record
      const video = await storage.createVideo({
        postId,
        userId,
        title: post.title,
        videoData: null,
        videoPath: null,
        thumbnail: "",
        duration: totalDuration,
        aspectRatio: "9:16",
        hasCaption,
        musicStyle,
      });
      console.log(`[video-export] Video record created: ${video.id}`);

      // Update post status
      await storage.updatePostStatus(postId, userId, "completed");

      res.json(video);
    } catch (error: any) {
      console.error(`[video-export] Error:`, error.message);
      console.error(`[video-export] Stack:`, error.stack);
      res.status(500).json({ 
        error: "Failed to process video",
        message: error.message || "Video processing failed",
        code: "VIDEO_PROCESSING_ERROR"
      });
    }
  });

  // Download video file
  app.get("/api/videos/:id/download", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const video = await storage.getVideo(req.params.id, userId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // For Supabase Storage videos, redirect to signed URL
      if (video.videoPath) {
        try {
          const signedUrl = await supabaseStorage.getVideoSignedUrl(video.videoPath);
          // Redirect to signed URL with download disposition
          return res.redirect(signedUrl);
        } catch (storageError) {
          console.error("[download] Supabase signed URL error:", storageError);
          return res.status(500).json({ error: "Failed to generate download URL" });
        }
      }

      // Legacy fallback: local file path
      const videoSource = video.videoData;
      if (!videoSource) {
        return res.status(404).json({ error: "Video file not found" });
      }

      const videoFilePath = join(process.cwd(), "uploads", "videos", videoSource);
      try {
        await fs.access(videoFilePath);
        res.download(videoFilePath, `${video.title}.mp4`);
      } catch {
        return res.status(404).json({ error: "Video file not found" });
      }
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download video" });
    }
  });

  // Delete video
  app.delete("/api/videos/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      await storage.deleteVideo(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete video error:", error);
      if (error.message.includes("not found") || error.message.includes("Unauthorized")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete video" });
      }
    }
  });



  // GET /api/videos/:videoId/captions - Get existing captions for a video
  app.get("/api/videos/:videoId/captions", requireAuth as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { videoId } = req.params;

    // Get transcription
    const transcription = await storage.getTranscription(videoId, userId);
    
    // Return null instead of 404 to prevent frontend spam when captions don't exist yet
    if (!transcription) {
      return res.json(null);
    }

    // Sanitize captions before response to prevent ByteString errors
    const safeCaptions = (transcription.captions as any[])?.map((c: any) => ({
      ...c,
      originalText: utf8Safe(c.originalText),
      viralText: utf8Safe(c.viralText),
      words: c.words?.map((w: any) => ({ ...w, word: utf8Safe(w.word) })) || [],
      highlightWords: c.highlightWords?.map((w: string) => utf8Safe(w)) || [],
    })) || [];

    res.json({ ...transcription, captions: safeCaptions });
  }));

  // GET /api/videos/:videoId - Get single video by ID
  app.get("/api/videos/:videoId", requireAuth as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { videoId } = req.params;

    console.log(`[video-get] Fetching video ${videoId} for user ${userId}`);
    
    const video = await storage.getVideo(videoId, userId);
    if (!video) {
      // Debug: Check if video exists with different userId
      const allVideos = await storage.getVideosDebug(videoId);
      if (allVideos && allVideos.length > 0) {
        console.error(`[video-get] Video ${videoId} exists but belongs to user ${allVideos[0].userId}, not ${userId}`);
      } else {
        console.error(`[video-get] Video ${videoId} does not exist at all`);
      }
      throw createError("Video not found", 404, "VIDEO_NOT_FOUND");
    }

    // Add signed URL if video has a storage path
    let signedUrl: string | null = null;
    if (video.videoPath) {
      try {
        signedUrl = await getVideoSignedUrl(video.videoPath);
      } catch (err) {
        console.error(`[video-get] Failed to get signed URL:`, err);
      }
    }

    res.json({ ...video, signedUrl });
  }));

  // GET /api/transcriptions/:videoId - Get transcription by video ID (alternative route)
  app.get("/api/transcriptions/:videoId", requireAuth as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { videoId } = req.params;

    const transcription = await storage.getTranscription(videoId, userId);
    if (!transcription) {
      throw createError("Transcription not found", 404, "TRANSCRIPTION_NOT_FOUND");
    }

    const safeCaptions = (transcription.captions as any[])?.map((c: any) => ({
      ...c,
      originalText: utf8Safe(c.originalText),
      viralText: utf8Safe(c.viralText),
      words: c.words?.map((w: any) => ({ ...w, word: utf8Safe(w.word) })) || [],
      highlightWords: c.highlightWords?.map((w: string) => utf8Safe(w)) || [],
    })) || [];

    res.json({ ...transcription, captions: safeCaptions });
  }));

  // PUT /api/transcriptions/:id - Update transcription captions and style
  app.put("/api/transcriptions/:id", requireAuth as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const { captions, styleSettings } = req.body;

    const transcription = await storage.updateTranscription(id, userId, {
      captions,
      styleSettings,
      updatedAt: new Date(),
    });

    if (!transcription) {
      throw createError("Transcription not found", 404, "TRANSCRIPTION_NOT_FOUND");
    }

    res.json(transcription);
  }));

  // POST /api/videos/:videoId/export-with-captions - Export video with burned-in captions (subscription gated)
  app.post("/api/videos/:videoId/export-with-captions", requireAuth as any, videoLimiter, checkExportLimit as any, asyncHandler(async (req: any, res) => {
    const userId = req.user.sub;
    const { videoId } = req.params;
    const { captions, styleSettings, effects } = req.body;

    const video = await storage.getVideo(videoId, userId);
    if (!video) {
      throw createError("Video not found", 404, "VIDEO_NOT_FOUND");
    }

    const storagePath = (video as any).videoPath || (video as any).video_path;
    if (!storagePath) {
      throw createError("Video has no storage path", 400, "NO_STORAGE_PATH");
    }

    console.log(`[export-captions] Starting for video ${videoId}, user ${userId}`);

    const edl = effects?.edl;

    console.log(`[export-captions] Using FFmpeg renderer`);

    const tempDir = join(process.cwd(), "uploads", "temp");
    let tempVideoFile: string | null = null;

    try {
      const bucket = (video as any).storageBucket || "renders";
      if (bucket === "clips") {
        const { downloadClipToTemp } = await import("./lib/supabaseStorage");
        tempVideoFile = await downloadClipToTemp(storagePath, tempDir);
      } else {
        tempVideoFile = await downloadVideoToTemp(storagePath, tempDir);
      }

      const cuts = effects?.cuts || [];
      const captionSegments = captions || [];

      console.log(`[export-captions] FFmpeg: ${cuts.length} cuts, ${captionSegments.length} captions`);

      const outputFilename = await exportWithEdits({
        inputPath: tempVideoFile,
        cuts,
        captions: captionSegments,
        fps: edl?.fps || 30,
      });

      const localOutputPath = join(process.cwd(), "uploads", "videos", outputFilename);

      let newVideoPath: string | null = null;
      if (isStorageAvailable()) {
        try {
          const uploadResult = await uploadVideoToStorage(localOutputPath, userId);
          newVideoPath = uploadResult.path;
          await fs.unlink(localOutputPath).catch(() => {});
        } catch (uploadError: any) {
          console.error(`[export-captions] Upload failed:`, uploadError.message);
        }
      }

      await storage.updateVideo(videoId, userId, {
        hasCaption: true,
        ...(newVideoPath ? { videoPath: newVideoPath } : {}),
      });

      const transcription = await storage.getTranscription(videoId, userId);
      if (transcription) {
        await storage.updateTranscription(transcription.id, userId, {
          captions,
          styleSettings,
          lastExportedAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log(`[export-captions] FFmpeg export complete for video ${videoId}`);
      res.json({ success: true, message: "Video exported with edits", renderer: "ffmpeg" });
    } finally {
      if (tempVideoFile) {
        await fs.unlink(tempVideoFile).catch(() => {});
      }
    }
  }));

  // Get trending music tracks
  app.get("/api/trending-music", async (req, res) => {
    try {
      const tracks = await trendingMusicService.getTrendingTracks();
      res.json(tracks);
    } catch (error) {
      console.error("Failed to fetch trending music:", error);
      res.status(500).json({ error: "Failed to fetch trending music" });
    }
  });

  // Get trending music info for a specific vibe
  app.get("/api/trending-music/:vibe", async (req, res) => {
    try {
      const vibe = decodeURIComponent(req.params.vibe);
      const info = await trendingMusicService.getTrendingMusicInfo(vibe);
      res.json(info);
    } catch (error) {
      console.error("Failed to fetch trending music info:", error);
      res.status(500).json({ error: "Failed to fetch trending music info" });
    }
  });

  app.get("/api/pexels", async (req, res) => {
    try {
      const query = req.query.query as string;
      const count = parseInt(req.query.count as string) || 6;
      
      if (query) {
        const photos = await searchPhotos(query, Math.min(count, 20));
        res.json({ photos });
      } else {
        const photos = await getCuratedPhotos(Math.min(count, 20));
        res.json({ photos });
      }
    } catch (error) {
      console.error("Failed to fetch Pexels photos:", error);
      res.status(500).json({ error: "Failed to fetch photos", photos: [] });
    }
  });

  app.get("/api/pexels/media", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 8;
      const media = await getMixedMedia(Math.min(count, 20));
      res.json({ media });
    } catch (error) {
      console.error("Failed to fetch Pexels media:", error);
      res.status(500).json({ error: "Failed to fetch media" });
    }
  });

  app.get("/api/pexels/videos", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 6;
      const videos = await getCuratedVideos(Math.min(count, 20));
      res.json({ videos });
    } catch (error) {
      console.error("Failed to fetch Pexels videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/pexels/photos", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 6;
      const photos = await getCuratedPhotos(Math.min(count, 20));
      res.json({ photos });
    } catch (error) {
      console.error("Failed to fetch Pexels photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  const httpServer = existingServer || createServer(app);
  return httpServer;
}
