/**
 * POST /api/subscription/create-checkout
 * Creates a Stripe Checkout session for the given subscription tier.
 *
 * Security:
 *   • Requires an authenticated Supabase session — anonymous users receive 401.
 *   • Validates the requested tier against the known set of price IDs.
 *   • Validates successUrl / cancelUrl are same-origin to prevent open-redirect.
 *   • Never surfaces internal env-var names or Stripe internals to the client.
 */
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const VALID_TIERS = ["pro", "elite"] as const
type Tier = (typeof VALID_TIERS)[number]

const PRICE_IDS: Record<Tier, string | undefined> = {
  pro:   process.env.STRIPE_PRO_PRICE_ID,
  elite: process.env.STRIPE_ELITE_PRICE_ID,
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Stripe is not configured")
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" })
}

/** Allow only same-origin absolute URLs or relative paths. */
function isSafeUrl(raw: unknown, origin: string): boolean {
  if (typeof raw !== "string" || !raw) return false
  try {
    const url = new URL(raw)
    return url.origin === origin
  } catch {
    // Not an absolute URL — reject (we only accept absolute URLs here)
    return false
  }
}

export async function POST(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { tier, successUrl, cancelUrl } = body as Record<string, unknown>
  const tierNorm = typeof tier === "string" ? tier.toLowerCase() : ""

  // ── Validate tier ───────────────────────────────────────────────────────────
  if (!VALID_TIERS.includes(tierNorm as Tier)) {
    return NextResponse.json({ error: "Invalid subscription tier." }, { status: 400 })
  }

  const priceId = PRICE_IDS[tierNorm as Tier]
  if (!priceId) {
    // Do NOT reveal env-var names to the caller
    return NextResponse.json(
      { error: "This subscription tier is not available right now." },
      { status: 503 },
    )
  }

  // ── Validate redirect URLs (prevent open redirect) ──────────────────────────
  const origin = req.nextUrl.origin
  const safeSuccess = isSafeUrl(successUrl, origin)
    ? (successUrl as string)
    : `${origin}/subscription?success=1`
  const safeCancel = isSafeUrl(cancelUrl, origin)
    ? (cancelUrl as string)
    : `${origin}/subscription?cancelled=1`

  // ── Create Stripe session ────────────────────────────────────────────────────
  try {
    const stripe  = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode:                "subscription",
      payment_method_types: ["card"],
      line_items:          [{ price: priceId, quantity: 1 }],
      customer_email:      user.email ?? undefined,
      // client_reference_id is the authoritative user linkage —
      // validated in the webhook before any tier update is applied.
      client_reference_id: user.id,
      metadata:            { tier: tierNorm, userId: user.id },
      success_url:         safeSuccess,
      cancel_url:          safeCancel,
    })

    return NextResponse.json({ url: session.url })
  } catch {
    // Never surface raw Stripe or config errors to the client
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 },
    )
  }
}
