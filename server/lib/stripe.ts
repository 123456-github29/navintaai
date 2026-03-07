import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export type PlanId = "free" | "starter" | "pro" | "studio";
export type BillingInterval = "monthly" | "yearly";

export interface PlanFeatures {
  plan: PlanId;
  watermarkRequired: boolean;
  aiBroll: boolean;
  aiVoice: boolean;
  maxExports: number;
  aiContentPlanning: boolean;
  recordMode: boolean;
  autoEditing: boolean;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    plan: "free",
    watermarkRequired: true,
    aiBroll: false,
    aiVoice: false,
    maxExports: 3,
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: false,
  },
  starter: {
    plan: "starter",
    watermarkRequired: false,
    aiBroll: true,
    aiVoice: false,
    maxExports: 20,
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: false,
  },
  pro: {
    plan: "pro",
    watermarkRequired: false,
    aiBroll: true,
    aiVoice: true,
    maxExports: 100,
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: true,
  },
  studio: {
    plan: "studio",
    watermarkRequired: false,
    aiBroll: true,
    aiVoice: true,
    maxExports: -1,
    aiContentPlanning: true,
    recordMode: true,
    autoEditing: true,
  },
};

export const PRICE_IDS: Record<string, { plan: PlanId; interval: BillingInterval }> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY || ""]: { plan: "starter", interval: "monthly" },
  [process.env.STRIPE_PRICE_STARTER_YEARLY || ""]: { plan: "starter", interval: "yearly" },
  [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: { plan: "pro", interval: "monthly" },
  [process.env.STRIPE_PRICE_PRO_YEARLY || ""]: { plan: "pro", interval: "yearly" },
  [process.env.STRIPE_PRICE_STUDIO_MONTHLY || ""]: { plan: "studio", interval: "monthly" },
  [process.env.STRIPE_PRICE_STUDIO_YEARLY || ""]: { plan: "studio", interval: "yearly" },
};

export function getPlanFromPriceId(priceId: string): PlanId {
  const mapping = PRICE_IDS[priceId];
  return mapping?.plan || "free";
}

export function getPriceId(plan: PlanId, interval: BillingInterval): string | null {
  const envKey = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[envKey] || null;
}

export function getSuccessUrl(): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";
  return `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
}

export function getCancelUrl(): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";
  return `${baseUrl}/pricing`;
}
