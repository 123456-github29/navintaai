# Supabase Edge Functions Deployment Guide

This guide explains how to deploy the Stripe Edge Functions to your Supabase project.

## Prerequisites

1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Login to Supabase CLI: `supabase login`
3. Link your project: `supabase link --project-ref iqfrjomoggddxwteuigk`

## Step 1: Add Secrets to Supabase

In your Supabase Dashboard, go to **Project Settings > Edge Functions > Secrets** and add:

```
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_STARTER_MONTHLY=price_1Ssub5GHLqcki8CvtTIlDHUa
STRIPE_PRICE_STARTER_YEARLY=price_1SsuetGHLqcki8CvwWc0j86L
STRIPE_PRICE_PRO_MONTHLY=price_1SsubOGHLqcki8CvvjUrLeD6
STRIPE_PRICE_PRO_YEARLY=price_1SsufKGHLqcki8Cva2S2vxx6
STRIPE_PRICE_STUDIO_MONTHLY=price_1SsubdGHLqcki8Cv2R3V2k7i
STRIPE_PRICE_STUDIO_YEARLY=price_1SsugOGHLqcki8Cv9URZAukF
```

## Step 2: Deploy Edge Functions

From your local machine with Supabase CLI installed:

```bash
# Navigate to your project root
cd /path/to/navinta

# Deploy the checkout function
supabase functions deploy stripe-checkout --project-ref iqfrjomoggddxwteuigk

# Deploy the webhook function
supabase functions deploy stripe-webhook --project-ref iqfrjomoggddxwteuigk
```

## Step 3: Configure Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://iqfrjomoggddxwteuigk.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
4. Copy the webhook signing secret and add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

## Step 4: Test the Integration

1. Log in to Navinta
2. Go to the pricing page
3. Click "Subscribe" on any paid plan
4. You should be redirected to Stripe Checkout
5. Complete a test payment (use test card 4242 4242 4242 4242)
6. Verify your subscription is active in the dashboard

## Troubleshooting

### Check Function Logs
```bash
supabase functions logs stripe-checkout --project-ref iqfrjomoggddxwteuigk
supabase functions logs stripe-webhook --project-ref iqfrjomoggddxwteuigk
```

### Common Issues

1. **"Unauthorized" error**: Make sure you're logged in and passing the access token
2. **"Price not configured"**: Verify all STRIPE_PRICE_* secrets are set in Supabase
3. **Webhook not working**: Check the webhook signing secret matches

## Database Tables Required

The Edge Functions expect these tables to exist in your Supabase database:

- `user_entitlements` - Stores subscription status and features
- `stripe_events_log` - Logs webhook events for debugging

These should already be created. If not, run the SQL from `shared/schema.ts`.
