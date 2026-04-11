/**
 * POST /api/signals/resolve
 *
 * Resolves a signal's outcome once a match is confirmed finished.
 * Uses the service-role client — only the server can set is_correct.
 *
 * This prevents clients from manipulating the track record by fabricating
 * outcomes. The route derives actual_outcome and is_correct from the score,
 * never trusting caller-supplied outcome strings.
 *
 * Request body:
 *   { signal_id: string, score_home: number, score_away: number }
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

interface ResolveBody {
  signal_id: string
  score_home: number
  score_away: number
}

function deriveOutcome(scoreHome: number, scoreAway: number): string {
  if (scoreHome > scoreAway) return "Home Win"
  if (scoreAway > scoreHome) return "Away Win"
  return "Draw"
}

function validateBody(body: unknown): body is ResolveBody {
  if (!body || typeof body !== "object") return false
  const b = body as Record<string, unknown>
  return (
    typeof b.signal_id === "string" &&
    b.signal_id.startsWith("sig_") &&
    typeof b.score_home === "number" &&
    typeof b.score_away === "number" &&
    b.score_home >= 0 &&
    b.score_away >= 0
  )
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!validateBody(body)) {
    return NextResponse.json({ error: "Invalid resolve payload" }, { status: 422 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_service_key" })
  }

  const supabase = createServiceClient()
  const { signal_id, score_home, score_away } = body

  // First: fetch the signal to read predicted_outcome (needed for is_correct)
  const { data: signal, error: fetchError } = await supabase
    .from("signal_snapshots")
    .select("predicted_outcome, is_correct")
    .eq("signal_id", signal_id)
    .single()

  if (fetchError || !signal) {
    // Signal not found — it was never recorded (demo mode or first run)
    return NextResponse.json({ ok: true, skipped: "not_found" })
  }

  // Don't re-resolve an already-resolved signal
  if (signal.is_correct !== null) {
    return NextResponse.json({ ok: true, skipped: "already_resolved" })
  }

  const actualOutcome = deriveOutcome(score_home, score_away)
  const isCorrect = signal.predicted_outcome === actualOutcome

  const { error: updateError } = await supabase
    .from("signal_snapshots")
    .update({
      actual_outcome: actualOutcome,
      score_home,
      score_away,
      is_correct: isCorrect,
      resolved_at: new Date().toISOString(),
    })
    .eq("signal_id", signal_id)

  if (updateError) {
    console.error("[signals/resolve]", updateError.message)
    return NextResponse.json({ error: "Failed to resolve signal" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, actual_outcome: actualOutcome, is_correct: isCorrect })
}
