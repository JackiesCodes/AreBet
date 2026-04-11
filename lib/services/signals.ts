/**
 * Signal service — client-safe reads and route-handler-delegated writes.
 *
 * Reads go directly to Supabase (public SELECT policy).
 * Writes go via route handlers (/api/signals/*) which use the service-role
 * client so no client-supplied data can tamper with the track record.
 */

import { createClient } from "@/lib/supabase/client"
import type { Match } from "@/types/match"
import type { SignalRecord } from "@/types/trust"
import { calculateValueEdge, removemargin, inferModelProbs } from "@/lib/utils/value-bet"

// ── Stable signal ID ─────────────────────────────────────────────────────────

/**
 * Deterministic signal ID: one signal per fixture per kickoff date.
 * Safe to call repeatedly — upsert on this key is idempotent.
 */
export function signalIdForFixture(fixtureId: number, kickoffISO: string): string {
  const date = kickoffISO.slice(0, 10) // YYYY-MM-DD
  return `sig_${fixtureId}_${date}`
}

// ── Shape helpers ─────────────────────────────────────────────────────────────

type ConfidenceTier = "high" | "mid" | "low"

function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 72) return "high"
  if (confidence >= 50) return "mid"
  return "low"
}

/**
 * Derive the predicted outcome label from match prediction data.
 * Uses modelProbs if available, falls back to advice string parsing.
 */
function derivePredictedOutcome(match: Match): string {
  const { modelProbs, advice, confidence } = match.prediction

  if (modelProbs) {
    const max = Math.max(modelProbs.home, modelProbs.draw, modelProbs.away)
    if (max === modelProbs.home) return "Home Win"
    if (max === modelProbs.draw) return "Draw"
    return "Away Win"
  }

  // Fallback: parse advice string
  const adv = advice.toLowerCase()
  if (adv.includes("home") || (adv.includes("win") && !adv.includes("away"))) return "Home Win"
  if (adv.includes("away")) return "Away Win"
  if (adv.includes("draw")) return "Draw"

  // Last resort: use highest confidence allocation
  return confidence >= 50 ? "Home Win" : "Draw"
}

// ── Payload type (shared between this service and route handler) ─────────────

export interface SignalPayload {
  signal_id: string
  fixture_id: number
  home_team: string
  away_team: string
  league: string
  kickoff_at: string
  predicted_outcome: string
  confidence: number
  confidence_tier: ConfidenceTier
  model_prob_home: number | null
  model_prob_draw: number | null
  model_prob_away: number | null
  market_prob_home: number | null
  market_prob_draw: number | null
  market_prob_away: number | null
  odds_home: number | null
  odds_draw: number | null
  odds_away: number | null
  value_selection: string | null
  value_edge_pct: number | null
}

/**
 * Build a SignalPayload from a Match object.
 * Returns null if the match lacks meaningful prediction data (confidence === 50
 * with no modelProbs means we only have the API default — not worth recording).
 */
export function buildSignalPayload(match: Match): SignalPayload | null {
  const { prediction, odds } = match

  // Skip default/placeholder predictions — no value in recording them
  if (
    prediction.confidence === 50 &&
    !prediction.modelProbs &&
    prediction.advice === "No prediction available"
  ) {
    return null
  }

  const modelProbs =
    prediction.modelProbs ?? inferModelProbs(prediction.confidence, prediction.advice)

  let marketProbs: { home: number; draw: number; away: number } | null = null
  if (odds.home > 0 && odds.draw > 0 && odds.away > 0) {
    marketProbs = removemargin(odds.home, odds.draw, odds.away)
  }

  const valueEdge = calculateValueEdge(match)
  const hasValue = valueEdge?.isValue === true

  return {
    signal_id: signalIdForFixture(match.id, match.kickoffISO),
    fixture_id: match.id,
    home_team: match.home.name,
    away_team: match.away.name,
    league: match.league,
    kickoff_at: match.kickoffISO,
    predicted_outcome: derivePredictedOutcome(match),
    confidence: prediction.confidence,
    confidence_tier: confidenceTier(prediction.confidence),
    model_prob_home: Math.round(modelProbs.home * 10000) / 10000,
    model_prob_draw: Math.round(modelProbs.draw * 10000) / 10000,
    model_prob_away: Math.round(modelProbs.away * 10000) / 10000,
    market_prob_home: marketProbs ? Math.round(marketProbs.home * 10000) / 10000 : null,
    market_prob_draw: marketProbs ? Math.round(marketProbs.draw * 10000) / 10000 : null,
    market_prob_away: marketProbs ? Math.round(marketProbs.away * 10000) / 10000 : null,
    odds_home: odds.home > 0 ? odds.home : null,
    odds_draw: odds.draw > 0 ? odds.draw : null,
    odds_away: odds.away > 0 ? odds.away : null,
    value_selection: hasValue ? valueEdge!.selection : null,
    value_edge_pct: hasValue ? Math.round(valueEdge!.edge * 10000) / 100 : null,
  }
}

// ── Client write: delegate to route handler ──────────────────────────────────

/**
 * Record a signal snapshot via the server route handler.
 * Safe to call from client components — no direct DB access.
 * Idempotent: duplicate calls for the same signal_id are silently ignored.
 */
export async function recordSignal(match: Match): Promise<void> {
  const payload = buildSignalPayload(match)
  if (!payload) return // Nothing worth recording

  try {
    await fetch("/api/signals/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // Signal recording is best-effort — never block the UI
  }
}

/**
 * Resolve a signal's outcome when a match finishes.
 * Called server-side or from the context when a match_finished event fires.
 */
export async function resolveSignal(
  signalId: string,
  scoreHome: number,
  scoreAway: number,
): Promise<void> {
  try {
    await fetch("/api/signals/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_id: signalId, score_home: scoreHome, score_away: scoreAway }),
    })
  } catch {
    // Best-effort — resolution can be retried on next poll
  }
}

// ── Read: fetch real signal history for Trust page ───────────────────────────

/** A Supabase row as returned from signal_snapshots */
interface SignalRow {
  signal_id: string
  fixture_id: number
  home_team: string
  away_team: string
  league: string
  kickoff_at: string
  predicted_outcome: string
  confidence: number
  confidence_tier: string
  odds_home: number | null
  odds_draw: number | null
  odds_away: number | null
  value_selection: string | null
  value_edge_pct: number | null
  actual_outcome: string | null
  is_correct: boolean | null
  resolved_at: string | null
}

/** Convert a DB row to the SignalRecord shape used by signal-performance.ts */
function rowToSignalRecord(row: SignalRow): SignalRecord {
  const tier = row.confidence_tier as "high" | "mid" | "low"

  // Pick the odds for the predicted selection
  let odds: number | undefined
  if (row.predicted_outcome === "Home Win") odds = row.odds_home ?? undefined
  else if (row.predicted_outcome === "Draw") odds = row.odds_draw ?? undefined
  else if (row.predicted_outcome === "Away Win") odds = row.odds_away ?? undefined

  return {
    id: row.signal_id,
    matchLabel: `${row.home_team} vs ${row.away_team}`,
    league: row.league,
    date: row.kickoff_at.slice(0, 10),
    confidence: row.confidence,
    confidenceTier: tier,
    predictedOutcome: row.predicted_outcome,
    actualOutcome: row.actual_outcome ?? "Pending",
    correct: row.is_correct ?? false,
    hadValueEdge: row.value_selection !== null,
    valueEdgePct: row.value_edge_pct ?? undefined,
    odds,
  }
}

export interface FetchSignalHistoryOptions {
  /** Limit results. Default: 500 */
  limit?: number
}

/**
 * Three honest data states for the Trust page:
 *
 * "live"        — Real resolved signals exist in Supabase.
 *                 Show actual track record with "Live track record" banner.
 *
 * "collecting"  — Supabase has recorded signals but none are resolved yet.
 *                 Match outcomes haven't been backfilled / matches haven't
 *                 finished yet. Show "Collecting signals" banner + demo stats.
 *
 * "no_data"     — Supabase unavailable, schema missing, or no signals at all.
 *                 Fall back to demo data with "Sample data" banner.
 */
export type SignalDataState = "live" | "collecting" | "no_data"

export interface SignalHistoryResult {
  records: SignalRecord[]
  state: SignalDataState
  /** Total resolved signals in Supabase (0 for non-live states) */
  total: number
  /** Total recorded signals including unresolved (for "collecting" state display) */
  totalRecorded: number
}

/**
 * Fetch real signal history from Supabase and determine the data state.
 *
 * Always queries resolved signals only for the chart/stats — we only show
 * track record for signals with known outcomes. Returns the data state so
 * the Trust page can show the correct honest banner.
 */
export async function fetchSignalHistory(
  options: FetchSignalHistoryOptions = {},
): Promise<SignalHistoryResult> {
  const { limit = 500 } = options

  const noData: SignalHistoryResult = {
    records: [],
    state: "no_data",
    total: 0,
    totalRecorded: 0,
  }

  try {
    const supabase = createClient()

    // Query 1: fetch resolved signals for stats
    const { data, error, count: resolvedCount } = await supabase
      .from("signal_snapshots")
      .select("*", { count: "exact" })
      .not("is_correct", "is", null)
      .order("kickoff_at", { ascending: false })
      .limit(limit)

    if (error) return noData

    // Query 2: check if ANY signals exist (to distinguish "collecting" from "no_data")
    const { count: totalCount } = await supabase
      .from("signal_snapshots")
      .select("signal_id", { count: "exact", head: true })

    const hasResolved = data && data.length > 0
    const hasAny = (totalCount ?? 0) > 0

    if (hasResolved) {
      return {
        records: (data as SignalRow[]).map(rowToSignalRecord),
        state: "live",
        total: resolvedCount ?? data.length,
        totalRecorded: totalCount ?? 0,
      }
    }

    if (hasAny) {
      // Signals exist but none resolved yet
      return {
        records: [],
        state: "collecting",
        total: 0,
        totalRecorded: totalCount ?? 0,
      }
    }

    return noData
  } catch {
    return noData
  }
}
