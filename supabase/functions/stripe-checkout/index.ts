import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY") || "",
    yearly: Deno.env.get("STRIPE_PRICE_STARTER_YEARLY") || "",
  },
  pro: {
    monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") || "",
    yearly: Deno.env.get("STRIPE_PRICE_PRO_YEARLY") || "",
  },
  studio: {
    monthly: Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY") || "",
    yearly: Deno.env.get("STRIPE_PRICE_STUDIO_YEARLY") || "",
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan, interval } = await req.json();

    if (!["starter", "pro", "studio"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["monthly", "yearly"].includes(interval)) {
      return new Response(
        JSON.stringify({ error: "Invalid interval" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceId = PRICE_IDS[plan]?.[interval];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Price not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingEntitlement } = await supabaseAdmin
      .from("user_entitlements")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = existingEntitlement?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const { error: upsertError } = await supabaseAdmin
        .from("user_entitlements")
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "free",
          status: "active",
          watermark_required: true,
          ai_broll: false,
          ai_voice: false,
          max_exports: 3,
          export_allowed: true,
          exports_used_today: 0,
        }, { onConflict: "user_id" });
      
      if (upsertError) {
        console.error("Failed to create entitlement:", upsertError);
      }
    }

    const origin = req.headers.get("origin") || "https://navinta.org";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        interval,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
