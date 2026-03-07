import { StripeSync, runMigrations } from "@supabase/stripe-sync-engine";
import type { PoolConfig } from "pg";

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const STRIPE_SCHEMA = "stripe";

let syncEngine: StripeSync | null = null;

function parseConnectionString(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },
  };
}

export async function initStripeSyncEngine(): Promise<StripeSync> {
  if (syncEngine) {
    return syncEngine;
  }

  if (!databaseUrl || !stripeSecretKey || !stripeWebhookSecret) {
    throw new Error("[Stripe Sync] Missing required environment variables");
  }

  console.log("[Stripe Sync] Running migrations...");
  try {
    await runMigrations({
      schema: STRIPE_SCHEMA,
      databaseUrl,
    });
    console.log("[Stripe Sync] Migrations completed successfully");
  } catch (error: any) {
    console.error("[Stripe Sync] Migration error:", error.message);
  }

  const poolConfig = parseConnectionString(databaseUrl);

  syncEngine = new StripeSync({
    schema: STRIPE_SCHEMA,
    poolConfig,
    stripeSecretKey,
    stripeWebhookSecret,
    backfillRelatedEntities: true,
  });

  console.log("[Stripe Sync] Engine initialized");
  return syncEngine;
}

export function getStripeSyncEngine(): StripeSync | null {
  return syncEngine;
}

export async function processStripeWebhook(
  payload: Buffer | string,
  signature: string
): Promise<void> {
  const engine = await initStripeSyncEngine();
  await engine.processWebhook(payload, signature);
}

export async function syncStripeEntity(entityId: string): Promise<void> {
  const engine = await initStripeSyncEngine();
  await engine.syncSingleEntity(entityId);
  console.log(`[Stripe Sync] Synced entity: ${entityId}`);
}

export async function backfillStripeData(
  object: "customer" | "product" | "price" | "subscription" | "invoice" | "charge" | "all" = "all",
  options?: { gte?: number; lte?: number }
): Promise<void> {
  const engine = await initStripeSyncEngine();
  await engine.syncBackfill({
    object,
    created: options,
  });
  console.log(`[Stripe Sync] Backfill completed for: ${object}`);
}
