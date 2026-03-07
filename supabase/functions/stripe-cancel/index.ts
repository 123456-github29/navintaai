import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

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

    const { refund = false } = await req.json();

    // Get user's subscription from entitlements
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: entitlement, error: entError } = await supabaseAdmin
      .from("user_entitlements")
      .select("stripe_subscription_id, stripe_customer_id, plan")
      .eq("user_id", user.id)
      .single();

    if (entError || !entitlement?.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (entitlement.plan === "free") {
      return new Response(
        JSON.stringify({ error: "You are on the free plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cancel the subscription
    const subscription = await stripe.subscriptions.cancel(entitlement.stripe_subscription_id);

    // If refund is requested, refund the latest invoice
    let refundResult = null;
    if (refund) {
      try {
        // Get the latest invoice for this subscription
        const invoices = await stripe.invoices.list({
          subscription: entitlement.stripe_subscription_id,
          limit: 1,
        });

        // Find the most recent paid invoice with a charge
        const paidInvoice = invoices.data.find(inv => inv.status === "paid" && inv.charge);
        
        if (paidInvoice && paidInvoice.charge) {
          const chargeId = typeof paidInvoice.charge === "string" 
            ? paidInvoice.charge 
            : paidInvoice.charge.id;
          
          refundResult = await stripe.refunds.create({
            charge: chargeId,
            reason: "requested_by_customer",
          });
        }
      } catch (refundError) {
        console.error("Refund error:", refundError);
        // Continue even if refund fails - subscription is already cancelled
      }
    }

    // Update entitlements to free plan
    await supabaseAdmin
      .from("user_entitlements")
      .update({
        plan: "free",
        status: "cancelled",
        stripe_subscription_id: null,
        watermark_required: true,
        ai_broll: false,
        ai_voice: false,
        max_exports: 3,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: refund && refundResult 
          ? "Subscription cancelled and refund processed" 
          : "Subscription cancelled",
        refunded: !!refundResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cancel error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
