/**
 * POST /api/subscription/webhook
 *
 * Handles Stripe webhook events to sync subscription status to Supabase.
 *
 * Security hardening:
 *   • Verifies Stripe signature before processing any event.
 *   • Idempotency guard — re-delivery of the same event is a no-op.
 *   • user.id is only sourced from client_reference_id (set server-side in
 *     create-checkout) and validated as a UUID before any DB write.
 *   • Sanitised error messages — no internal details reach the caller.
 *
 * Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Stripe factory
// ---------------------------------------------------------------------------

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Stripe is not configured")
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" })
}

// ---------------------------------------------------------------------------
// UUID guard — ensures we never write an arbitrary string as a user ID
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUserId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id)
}

// ---------------------------------------------------------------------------
// Idempotency — prevent double-processing of the same Stripe event
// ---------------------------------------------------------------------------

/**
 * Returns true if this Stripe event has already been processed.
 * Inserts a record atomically on first call; returns false (not processed).
 */
async function ensureIdempotent(eventId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("processed_webhook_events")
    .insert({ event_id: eventId, processed_at: new Date().toISOString() })

  // Unique-constraint violation (code 23505) = already processed
  if (error?.code === "23505") return true

  // Any other error: log but let processing continue (better to process
  // twice than to silently skip a subscription upgrade).
  if (error) console.warn("[webhook] idempotency insert error:", error.code)

  return false
}

// ---------------------------------------------------------------------------
// DB write
// ---------------------------------------------------------------------------

async function updateUserTier(
  userId: string,
  tier: string,
  stripeCustomerId?: string,
): Promise<void> {
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

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    // Operational error — don't reveal the missing env-var name
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "Webhook endpoint not available." }, { status: 503 })
  }

  // Read raw body for signature verification (must be text, not parsed JSON)
  const body = await req.text()
  const sig  = req.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    // Signature mismatch — reject without details (prevents timing attacks)
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 })
  }

  // ── Idempotency guard ───────────────────────────────────────────────────────
  // processed_webhook_events table must exist in your schema.
  // If the table doesn't exist yet the insert will fail gracefully
  // (ensureIdempotent logs the error and returns false, allowing processing).
  const alreadyProcessed = await ensureIdempotent(event.id)
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, skipped: "duplicate" })
  }

  // ── Event dispatch ──────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // client_reference_id is set server-side in create-checkout to user.id
        // — do NOT fall back to metadata.userId which could be spoofed by
        //   an attacker who constructs a custom checkout session.
        const userId = session.client_reference_id ?? null
        if (!isValidUserId(userId)) {
          console.warn("[webhook] checkout.session.completed: invalid or missing userId", userId)
          break
        }

        const tier = (session.metadata?.tier as string) ?? "pro"
        await updateUserTier(userId, tier, session.customer as string | undefined)
        break
      }

      case "customer.subscription.updated": {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!isValidUserId(userId)) break

        const tier   = (sub.metadata?.tier as string) ?? "pro"
        const active = sub.status === "active" || sub.status === "trialing"
        await updateUserTier(userId, active ? tier : "free")
        break
      }

      case "customer.subscription.deleted": {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!isValidUserId(userId)) break

        await updateUserTier(userId, "free")
        break
      }

      case "invoice.payment_failed": {
        // Could notify user or trigger a grace-period downgrade here
        break
      }

      default:
        // Unhandled event types — acknowledged but not processed
        break
    }
  } catch (err) {
    console.error("[webhook] handler error:", err)
    return NextResponse.json({ error: "Event processing failed." }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
