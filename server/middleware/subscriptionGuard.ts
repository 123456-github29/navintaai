import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface SubscriptionRequest extends Request {
  user?: { sub: string; email?: string };
  entitlement?: {
    plan: string;
    status: string;
    watermarkRequired: boolean;
    aiBroll: boolean;
    aiVoice: boolean;
    maxExports: number;
    exportsUsedToday: number;
    exportAllowed: boolean;
    stripeCustomerId?: string | null;
    currentPeriodEnd?: Date | null;
  };
}

export async function loadUserEntitlement(
  req: SubscriptionRequest,
  _res: Response,
  next: NextFunction
) {
  const userId = req.user?.sub;
  if (!userId) {
    return next();
  }

  try {
    let entitlement = await storage.getUserEntitlement(userId);
    
    // Auto-create free entitlement for users who don't have one
    if (!entitlement) {
      console.log(`[Subscription Guard] Creating free entitlement for user ${userId}`);
      await storage.createUserEntitlement({
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
      entitlement = await storage.getUserEntitlement(userId);
    }
    
    // Auto-repair broken free tier entitlements
    // If user is on free plan but has exportAllowed=false (from failed payment attempt),
    // reset them to working free tier with exports enabled
    if (entitlement && entitlement.plan === "free" && !entitlement.exportAllowed) {
      console.log(`[Subscription Guard] Auto-repairing broken free tier entitlement for ${userId}`);
      await storage.upsertUserEntitlement(userId, {
        status: "active",
        exportAllowed: true,
        watermarkRequired: true,
        maxExports: 3,
      });
      entitlement = await storage.getUserEntitlement(userId);
    }
    
    if (entitlement) {
      req.entitlement = {
        plan: entitlement.plan,
        status: entitlement.status,
        watermarkRequired: entitlement.watermarkRequired,
        aiBroll: entitlement.aiBroll,
        aiVoice: entitlement.aiVoice,
        maxExports: entitlement.maxExports,
        exportsUsedToday: entitlement.exportsUsedToday,
        exportAllowed: entitlement.exportAllowed,
        stripeCustomerId: entitlement.stripeCustomerId,
        currentPeriodEnd: entitlement.currentPeriodEnd,
      };
    } else {
      req.entitlement = {
        plan: "free",
        status: "active",
        watermarkRequired: true,
        aiBroll: false,
        aiVoice: false,
        maxExports: 3,
        exportsUsedToday: 0,
        exportAllowed: true,
      };
    }
  } catch (err) {
    console.error("[Subscription Guard] Failed to load entitlement:", err);
    req.entitlement = {
      plan: "free",
      status: "active",
      watermarkRequired: true,
      aiBroll: false,
      aiVoice: false,
      maxExports: 3,
      exportsUsedToday: 0,
      exportAllowed: true,
    };
  }

  next();
}

export function requireActiveSubscription(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
) {
  const entitlement = req.entitlement;

  if (!entitlement) {
    return res.status(402).json({
      error: "Subscription required",
      code: "SUBSCRIPTION_REQUIRED",
      message: "Please subscribe to access this feature",
    });
  }

  if (entitlement.status === "past_due" || entitlement.status === "canceled") {
    return res.status(402).json({
      error: "Subscription inactive",
      code: "SUBSCRIPTION_INACTIVE",
      message: "Your subscription is inactive. Please update your payment method.",
      status: entitlement.status,
    });
  }

  next();
}

export function requirePaidPlan(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
) {
  const entitlement = req.entitlement;

  if (!entitlement || entitlement.plan === "free") {
    return res.status(402).json({
      error: "Paid plan required",
      code: "PAID_PLAN_REQUIRED",
      message: "This feature requires a paid subscription",
      currentPlan: entitlement?.plan || "free",
    });
  }

  if (entitlement.status !== "active" && entitlement.status !== "trialing") {
    return res.status(402).json({
      error: "Subscription inactive",
      code: "SUBSCRIPTION_INACTIVE",
      message: "Your subscription is inactive. Please update your payment method.",
      status: entitlement.status,
    });
  }

  next();
}

export function requireAiBroll(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
) {
  const entitlement = req.entitlement;

  if (!entitlement?.aiBroll) {
    return res.status(402).json({
      error: "AI B-roll not available",
      code: "AI_BROLL_LOCKED",
      message: "AI B-roll requires a Starter plan or higher",
      currentPlan: entitlement?.plan || "free",
    });
  }

  next();
}

export function requireAiVoice(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
) {
  const entitlement = req.entitlement;

  if (!entitlement?.aiVoice) {
    return res.status(402).json({
      error: "AI Voice not available",
      code: "AI_VOICE_LOCKED",
      message: "AI Voice requires a Pro plan or higher",
      currentPlan: entitlement?.plan || "free",
    });
  }

  next();
}

export async function checkExportLimit(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
) {
  const entitlement = req.entitlement;
  const userId = req.user?.sub;

  if (!entitlement || !userId) {
    return res.status(402).json({
      error: "Subscription required",
      code: "SUBSCRIPTION_REQUIRED",
      message: "Please subscribe to export videos",
    });
  }

  if (!entitlement.exportAllowed) {
    return res.status(402).json({
      error: "Export not allowed",
      code: "EXPORT_LOCKED",
      message: "Your subscription does not allow exports. Please update your payment method.",
    });
  }

  if (entitlement.maxExports === -1) {
    return next();
  }

  if (entitlement.exportsUsedToday >= entitlement.maxExports) {
    return res.status(402).json({
      error: "Export limit reached",
      code: "EXPORT_LIMIT_REACHED",
      message: `You've reached your daily export limit (${entitlement.maxExports}). Upgrade your plan for more exports.`,
      limit: entitlement.maxExports,
      used: entitlement.exportsUsedToday,
      currentPlan: entitlement.plan,
    });
  }

  next();
}

export function getWatermarkRequired(req: SubscriptionRequest): boolean {
  return req.entitlement?.watermarkRequired ?? true;
}
