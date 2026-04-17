/**
 * POST /api/subscription/portal
 * Creates a Stripe Customer Portal session for managing billing.
 * Requires: STRIPE_SECRET_KEY, user must be signed in with a stripe_customer_id.
 */
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured")
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    const customerId = profile?.stripe_customer_id as string | undefined
    if (!customerId) {
      return NextResponse.json({ error: "No subscription found for this account" }, { status: 400 })
    }

    const origin = req.nextUrl.origin
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/subscription`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
