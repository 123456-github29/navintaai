import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const PLAN_FEATURES: Record<string, { watermarkRequired: boolean; aiBroll: boolean; aiVoice: boolean; maxExports: number }> = {
  free: { watermarkRequired: true, aiBroll: false, aiVoice: false, maxExports: 3 },
  starter: { watermarkRequired: false, aiBroll: false, aiVoice: false, maxExports: 10 },
  pro: { watermarkRequired: false, aiBroll: true, aiVoice: false, maxExports: 50 },
  studio: { watermarkRequired: false, aiBroll: true, aiVoice: true, maxExports: 999 },
};

function getPlanFromPriceId(priceId: string): string {
  const priceMappings: Record<string, string> = {
    [Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY") || ""]: "starter",
    [Deno.env.get("STRIPE_PRICE_STARTER_YEARLY") || ""]: "starter",
    [Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") || ""]: "pro",
    [Deno.env.get("STRIPE_PRICE_PRO_YEARLY") || ""]: "pro",
    [Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY") || ""]: "studio",
    [Deno.env.get("STRIPE_PRICE_STUDIO_YEARLY") || ""]: "studio",
  };
  return priceMappings[priceId] || "free";
}

async function updateEntitlement(
  userId: string,
  customerId: string,
  subscriptionId: string,
  plan: string,
  status: string,
  currentPeriodEnd: Date
) {
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  const { error } = await supabaseAdmin
    .from("user_entitlements")
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      status,
      export_allowed: true,
      watermark_required: features.watermarkRequired,
      ai_broll: features.aiBroll,
      ai_voice: features.aiVoice,
      max_exports: features.maxExports,
      current_period_end: currentPeriodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    console.error("Failed to update entitlement:", error);
    throw error;
  }
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("user_entitlements")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (data?.user_id) return data.user_id;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer as Stripe.Customer).metadata?.supabase_user_id || null;
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing event: ${event.type}`);

    await supabaseAdmin
      .from("stripe_events_log")
      .insert({
        event_id: event.id,
        type: event.type,
        payload: event,
        processed: false,
      });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id || "";
          const plan = getPlanFromPriceId(priceId);

          await updateEntitlement(
            userId,
            customerId,
            subscriptionId,
            plan,
            "active",
            new Date(subscription.current_period_end * 1000)
          );
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (userId) {
          const priceId = subscription.items.data[0]?.price?.id || "";
          const plan = getPlanFromPriceId(priceId);
          const status = subscription.status === "active" ? "active" : 
                        subscription.status === "past_due" ? "past_due" : "inactive";

          await updateEntitlement(
            userId,
            customerId,
            subscription.id,
            plan,
            status,
            new Date(subscription.current_period_end * 1000)
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (userId) {
          await updateEntitlement(
            userId,
            customerId,
            subscription.id,
            "free",
            "cancelled",
            new Date()
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await getUserIdFromCustomer(customerId);

        if (userId) {
          const { error } = await supabaseAdmin
            .from("user_entitlements")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("user_id", userId);

          if (error) console.error("Failed to update status:", error);
        }
        break;
      }
    }

    await supabaseAdmin
      .from("stripe_events_log")
      .update({ processed: true })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
