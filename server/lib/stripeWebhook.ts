import Stripe from "stripe";
import { storage } from "../storage";
import type { Request, Response } from "express";
import { processStripeWebhook } from "./stripeSyncEngine";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

type PlanFeatures = {
  plan: string;
  watermarkRequired: boolean;
  aiBroll: boolean;
  aiVoice: boolean;
  maxExports: number;
};

const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    plan: "free",
    watermarkRequired: true,
    aiBroll: false,
    aiVoice: false,
    maxExports: 3,
  },
  starter: {
    plan: "starter",
    watermarkRequired: false,
    aiBroll: true,
    aiVoice: false,
    maxExports: 20,
  },
  pro: {
    plan: "pro",
    watermarkRequired: false,
    aiBroll: true,
    aiVoice: true,
    maxExports: 100,
  },
  studio: {
    plan: "studio",
    watermarkRequired: false,
    aiBroll: true,
    aiVoice: true,
    maxExports: -1,
  },
};

function getPlanFromPriceId(priceId: string): string {
  const priceMappings: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || ""]: "starter",
    [process.env.STRIPE_PRICE_STARTER_YEARLY || ""]: "starter",
    [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: "pro",
    [process.env.STRIPE_PRICE_PRO_YEARLY || ""]: "pro",
    [process.env.STRIPE_PRICE_STUDIO_MONTHLY || ""]: "studio",
    [process.env.STRIPE_PRICE_STUDIO_YEARLY || ""]: "studio",
  };
  return priceMappings[priceId] || "free";
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const customerEmail = session.customer_email || session.customer_details?.email;
  const supabaseUserId = session.metadata?.supabase_user_id || session.metadata?.user_id || session.client_reference_id;

  if (!customerEmail && !supabaseUserId) {
    console.error("[Stripe Webhook] checkout.session.completed: No customer email or user_id");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  const periodEnd = (subscription as any).current_period_end;
  const interval = subscription.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly";

  const entitlementData = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    plan: features.plan,
    status: "active",
    watermarkRequired: features.watermarkRequired,
    aiBroll: features.aiBroll,
    aiVoice: features.aiVoice,
    maxExports: features.maxExports,
    exportAllowed: true,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: false,
    billingInterval: interval,
  };

  if (supabaseUserId) {
    await storage.upsertUserEntitlement(supabaseUserId, entitlementData);
    console.log(`[Stripe Webhook] checkout.session.completed: userId=${supabaseUserId} -> ${plan} plan (${interval})`);
  } else if (customerEmail) {
    await storage.upsertUserEntitlementByEmail(customerEmail, entitlementData);
    console.log(`[Stripe Webhook] checkout.session.completed: email=${customerEmail} -> ${plan} plan (${interval})`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  const status = subscription.status === "active" ? "active" :
                 subscription.status === "past_due" ? "past_due" :
                 subscription.status === "canceled" ? "canceled" :
                 subscription.status === "trialing" ? "trialing" :
                 subscription.status === "incomplete" ? "past_due" :
                 subscription.status === "unpaid" ? "past_due" : "active";

  const periodEnd = (subscription as any).current_period_end;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

  const interval = subscription.items.data[0]?.price.recurring?.interval === "year" ? "yearly" : "monthly";

  await storage.updateUserEntitlementByStripeCustomer(customerId, {
    stripeSubscriptionId: subscription.id,
    plan: features.plan,
    status,
    watermarkRequired: features.watermarkRequired,
    aiBroll: features.aiBroll,
    aiVoice: features.aiVoice,
    maxExports: features.maxExports,
    exportAllowed: status === "active" || status === "trialing",
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd,
    billingInterval: interval,
  });

  console.log(`[Stripe Webhook] subscription.updated: customer ${customerId} -> ${plan} (${status}, cancelAtPeriodEnd=${cancelAtPeriodEnd})`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const freeFeatures = PLAN_FEATURES.free;

  await storage.updateUserEntitlementByStripeCustomer(customerId, {
    plan: "free",
    status: "canceled",
    watermarkRequired: freeFeatures.watermarkRequired,
    aiBroll: freeFeatures.aiBroll,
    aiVoice: freeFeatures.aiVoice,
    maxExports: freeFeatures.maxExports,
    exportAllowed: true,
    currentPeriodEnd: null,
  });

  console.log(`[Stripe Webhook] subscription.deleted: customer ${customerId} -> free plan`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) {
    console.log(`[Stripe Webhook] invoice.paid: No subscription for invoice ${invoice.id}`);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
  const periodEnd = (subscription as any).current_period_end;

  await storage.updateUserEntitlementByStripeCustomer(customerId, {
    plan: features.plan,
    status: "active",
    watermarkRequired: features.watermarkRequired,
    aiBroll: features.aiBroll,
    aiVoice: features.aiVoice,
    maxExports: features.maxExports,
    exportAllowed: true,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  });

  console.log(`[Stripe Webhook] invoice.paid: customer ${customerId} -> ${plan} plan renewed`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  await storage.updateUserEntitlementByStripeCustomer(customerId, {
    status: "past_due",
    exportAllowed: false,
  });

  console.log(`[Stripe Webhook] invoice.payment_failed: customer ${customerId} -> past_due`);
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  console.log("[Stripe Webhook] Received webhook request");

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  if (!sig) {
    console.error("[Stripe Webhook] No stripe-signature header");
    return res.status(400).json({ error: "No signature header" });
  }

  let event: Stripe.Event;

  // rawBody is captured as string by custom middleware before JSON parsing
  const rawBody = (req as any).rawBody as string;
  console.log("[Stripe Webhook] Raw body type:", typeof rawBody);
  console.log("[Stripe Webhook] Raw body length:", rawBody?.length || 0);
  
  if (!rawBody || typeof rawBody !== 'string') {
    console.error("[Stripe Webhook] No raw body string available");
    return res.status(400).json({ error: "No raw body for verification" });
  }

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log("[Stripe Webhook] Signature verified successfully for event:", event.type);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const claimed = await storage.tryClaimWebhookEvent(event.id, event.type);
  if (!claimed) {
    console.log(`[Stripe Webhook] Duplicate event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  // Log event to stripe_events_log for debugging/verification
  try {
    await storage.logStripeEvent(event.id, event.type, event);
    console.log(`[Stripe Webhook] Event ${event.id} logged to stripe_events_log`);
  } catch (logErr: any) {
    console.error(`[Stripe Webhook] Failed to log event: ${logErr.message}`);
  }

  try {
    // Sync to Supabase stripe schema using Stripe Sync Engine
    try {
      await processStripeWebhook(rawBody, sig);
      console.log(`[Stripe Sync] Event ${event.type} synced to stripe schema`);
    } catch (syncErr: any) {
      console.error(`[Stripe Sync] Failed to sync event: ${syncErr.message}`);
      // Continue with entitlement updates even if sync fails
    }

    // Handle entitlement updates
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as processed in stripe_events_log
    try {
      await storage.markStripeEventProcessed(event.id);
    } catch (markErr: any) {
      console.error(`[Stripe Webhook] Failed to mark event processed: ${markErr.message}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

export async function createBillingPortalSession(stripeCustomerId: string, returnUrl: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  console.log(`[Stripe] Billing portal created for customer ${stripeCustomerId}`);
  return session.url;
}

const PRODUCT_IDS: Record<string, string> = {
  starter: "prod_TqbocE9ndCZYKw",
  pro: "prod_TqbpksJcbCRgnF",
  studio: "prod_Tqbp7YpPhMZcZK",
};

const PRICE_IDS = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || "",
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
  },
  studio: {
    monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_STUDIO_YEARLY || "",
  },
};

async function getOrCreateStripeCustomer(userId: string, userEmail: string): Promise<string> {
  const existingEntitlement = await storage.getUserEntitlement(userId);
  if (existingEntitlement?.stripeCustomerId) {
    console.log(`[Stripe] Using existing customer: ${existingEntitlement.stripeCustomerId}`);
    return existingEntitlement.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: {
      userId,
    },
  });

  console.log(`[Stripe] Created new customer: ${customer.id} for user ${userId}`);
  
  await storage.upsertUserEntitlementByEmail(userEmail, {
    stripeCustomerId: customer.id,
    plan: "free",
    status: "active",
    watermarkRequired: true,
    aiBroll: false,
    aiVoice: false,
    maxExports: 3,
    exportAllowed: true,
  });

  return customer.id;
}

export async function createCheckoutSession(params: {
  plan: "starter" | "pro" | "studio";
  interval: "monthly" | "yearly";
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const { plan, interval, userId, userEmail, successUrl, cancelUrl } = params;

  const priceId = PRICE_IDS[plan]?.[interval];
  if (!priceId) {
    throw new Error(`Invalid plan/interval: ${plan}/${interval}`);
  }

  const productId = PRODUCT_IDS[plan];
  if (!productId) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const customerId = await getOrCreateStripeCustomer(userId, userEmail);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    client_reference_id: userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      supabase_user_id: userId,
      user_id: userId,
      product_id: productId,
      plan_name: plan,
      interval,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  console.log(`[Stripe] Checkout session created for ${userEmail}: ${plan} (${interval}) with customer ${customerId}`);
  return session.url || "";
}
