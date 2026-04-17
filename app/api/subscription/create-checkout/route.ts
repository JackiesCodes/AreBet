/**
 * POST /api/subscription/create-checkout
 * Creates a Stripe Checkout session for the given tier.
 * Requires: STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID, STRIPE_ELITE_PRICE_ID
 */
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  elite: process.env.STRIPE_ELITE_PRICE_ID,
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured")
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" })
}

export async function POST(req: NextRequest) {
  try {
    const { tier, successUrl, cancelUrl } = await req.json() as {
      tier: string
      successUrl?: string
      cancelUrl?: string
    }

    const priceId = PRICE_IDS[tier?.toLowerCase()]
    if (!priceId) {
      return NextResponse.json(
        { error: `No price configured for tier "${tier}". Set STRIPE_${tier?.toUpperCase()}_PRICE_ID.` },
        { status: 400 },
      )
    }

    // Get current user for pre-filling email
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const stripe = getStripe()
    const origin = req.nextUrl.origin

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user?.email ?? undefined,
      client_reference_id: user?.id ?? undefined,
      metadata: { tier, userId: user?.id ?? "" },
      success_url: successUrl ?? `${origin}/subscription?success=1`,
      cancel_url: cancelUrl ?? `${origin}/subscription?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
