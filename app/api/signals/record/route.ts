/**
 * POST /api/signals/record
 *
 * Records a signal snapshot to Supabase using the service-role client.
 * This is the only write path for signal_snapshots — no client writes directly.
 *
 * Idempotent: duplicate calls for the same signal_id are silently ignored
 * (upsert with DO NOTHING on conflict).
 *
 * Request body: SignalPayload (see lib/services/signals.ts)
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createRateLimiter, getClientIp } from "@/lib/utils/rate-limit"
import type { SignalPayload } from "@/lib/services/signals"

// 60 requests per 2 minutes per IP — well above what the context generates
// (one per UPCOMING match per session) but blocks bulk abuse.
const limiter = createRateLimiter({ windowMs: 2 * 60_000, max: 60 })

// Fields that are locked at signal creation — never updated after first write
const SIGNAL_CREATION_FIELDS = [
  "signal_id",
  "fixture_id",
  "home_team",
  "away_team",
  "league",
  "kickoff_at",
  "predicted_outcome",
  "confidence",
  "confidence_tier",
  "model_prob_home",
  "model_prob_draw",
  "model_prob_away",
  "market_prob_home",
  "market_prob_draw",
  "market_prob_away",
  "odds_home",
  "odds_draw",
  "odds_away",
  "value_selection",
  "value_edge_pct",
] as const

function validatePayload(body: unknown): body is SignalPayload {
  if (!body || typeof body !== "object") return false
  const b = body as Record<string, unknown>
  return (
    typeof b.signal_id === "string" &&
    b.signal_id.startsWith("sig_") &&
    typeof b.fixture_id === "number" &&
    typeof b.home_team === "string" &&
    typeof b.away_team === "string" &&
    typeof b.league === "string" &&
    typeof b.kickoff_at === "string" &&
    typeof b.predicted_outcome === "string" &&
    typeof b.confidence === "number" &&
    b.confidence >= 0 &&
    b.confidence <= 100 &&
    ["high", "mid", "low"].includes(b.confidence_tier as string)
  )
}

export async function POST(req: NextRequest) {
  // Rate limiting — checked before any DB work
  const ip = getClientIp(req)
  const limit = limiter.check(ip)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!validatePayload(body)) {
    return NextResponse.json({ error: "Invalid signal payload" }, { status: 422 })
  }

  // Bail out gracefully if service key is not configured (dev without Supabase)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_service_key" })
  }

  const supabase = createServiceClient()

  // Pick only creation fields — prevents any future injection of outcome fields
  const row = Object.fromEntries(
    SIGNAL_CREATION_FIELDS.map((k) => [k, (body as SignalPayload)[k] ?? null]),
  )

  const { error } = await supabase
    .from("signal_snapshots")
    .upsert(row, {
      onConflict: "signal_id",
      ignoreDuplicates: true, // First write wins — predictions locked at creation
    })

  if (error) {
    // Don't surface DB errors to the client — log and move on
    console.error("[signals/record]", error.message)
    return NextResponse.json({ error: "Failed to record signal" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
