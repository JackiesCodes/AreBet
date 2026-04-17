/**
 * POST /api/subscription/webhook
 * Handles Stripe webhook events to sync subscription status to Supabase.
 * Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured")
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" })
}

async function updateUserTier(userId: string, tier: string, stripeCustomerId?: string) {
  const supabase = createServiceClient()
  await supabase
    .from("profiles")
    .update({
      tier,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature failed: ${err}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = (session.client_reference_id ?? session.metadata?.userId) as string | null
        const tier = (session.metadata?.tier as string) ?? "pro"
        if (userId) await updateUserTier(userId, tier, session.customer as string)
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        const tier = sub.metadata?.tier ?? "pro"
        const active = sub.status === "active" || sub.status === "trialing"
        if (userId) await updateUserTier(userId, active ? tier : "free")
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (userId) await updateUserTier(userId, "free")
        break
      }

      case "invoice.payment_failed": {
        // Optionally: downgrade or notify user
        break
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
