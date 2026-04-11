/**
 * Signal backfill utility — SERVER ONLY.
 *
 * Fetches unresolved signal snapshots, queries API-Football for the
 * fixture result, derives the actual outcome, and resolves each signal
 * using the service-role client.
 *
 * Designed for idempotency: already-resolved signals are skipped.
 * Batched: never processes more than MAX_BATCH fixtures per call to
 * stay well within API-Football free-tier limits (100 req/day).
 *
 * NEVER import this in client components.
 */

import { createServiceClient } from "@/lib/supabase/service"

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"])
const MAX_BATCH = 15 // conservative limit — each call = 1 API-Football request

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnresolvedRow {
  signal_id: string
  fixture_id: number
  predicted_outcome: string
}

export interface BackfillResult {
  processed: number   // total signals examined
  resolved: number    // newly resolved this run
  skipped: number     // finished but had no valid result (e.g. postponed)
  notFinished: number // fixture not finished yet — left pending
  errors: number
  messages: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveOutcome(homeGoals: number, awayGoals: number): string {
  if (homeGoals > awayGoals) return "Home Win"
  if (awayGoals > homeGoals) return "Away Win"
  return "Draw"
}

/**
 * Thin API-Football fixture fetch — avoids importing the full client
 * (which has in-memory caching not appropriate for server-side backfill).
 */
async function fetchFixtureResult(
  fixtureId: number,
): Promise<{ statusShort: string; goalsHome: number | null; goalsAway: number | null } | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return null

  const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null

  const json = await res.json()
  const fixture = json?.response?.[0]
  if (!fixture) return null

  return {
    statusShort: fixture.fixture?.status?.short ?? "",
    goalsHome: fixture.goals?.home ?? null,
    goalsAway: fixture.goals?.away ?? null,
  }
}

// ── Main backfill function ────────────────────────────────────────────────────

/**
 * Process up to MAX_BATCH unresolved signals.
 * Returns a summary of what happened.
 *
 * @param batchSize Override the default batch size (up to MAX_BATCH)
 */
export async function backfillUnresolvedSignals(
  batchSize = MAX_BATCH,
): Promise<BackfillResult> {
  const result: BackfillResult = {
    processed: 0,
    resolved: 0,
    skipped: 0,
    notFinished: 0,
    errors: 0,
    messages: [],
  }

  const limit = Math.min(batchSize, MAX_BATCH)

  const supabase = createServiceClient()

  // Fetch oldest unresolved signals first (process them in kickoff order)
  const { data: rows, error: fetchErr } = await supabase
    .from("signal_snapshots")
    .select("signal_id, fixture_id, predicted_outcome")
    .is("is_correct", null)
    .order("kickoff_at", { ascending: true })
    .limit(limit)

  if (fetchErr) {
    result.errors++
    result.messages.push(`DB fetch failed: ${fetchErr.message}`)
    return result
  }

  if (!rows || rows.length === 0) {
    result.messages.push("No unresolved signals found — nothing to do.")
    return result
  }

  result.processed = rows.length

  for (const row of rows as UnresolvedRow[]) {
    try {
      const fixture = await fetchFixtureResult(row.fixture_id)

      if (!fixture) {
        // API key missing or API error — stop trying
        result.errors++
        result.messages.push(
          `Could not fetch fixture ${row.fixture_id} — check API_FOOTBALL_KEY`,
        )
        break
      }

      if (!FINISHED_STATUSES.has(fixture.statusShort)) {
        result.notFinished++
        continue
      }

      // Fixture is finished but result data missing (e.g. AWD walkover with no score)
      if (fixture.goalsHome === null || fixture.goalsAway === null) {
        result.skipped++
        result.messages.push(
          `${row.signal_id}: finished (${fixture.statusShort}) but no goal data — skipped`,
        )
        continue
      }

      const actualOutcome = deriveOutcome(fixture.goalsHome, fixture.goalsAway)
      const isCorrect = row.predicted_outcome === actualOutcome

      const { error: updateErr } = await supabase
        .from("signal_snapshots")
        .update({
          actual_outcome: actualOutcome,
          score_home: fixture.goalsHome,
          score_away: fixture.goalsAway,
          is_correct: isCorrect,
          resolved_at: new Date().toISOString(),
        })
        .eq("signal_id", row.signal_id)

      if (updateErr) {
        result.errors++
        result.messages.push(`${row.signal_id}: update failed — ${updateErr.message}`)
        continue
      }

      result.resolved++
      result.messages.push(
        `${row.signal_id}: resolved → ${actualOutcome} (${isCorrect ? "✓ correct" : "✗ wrong"})`,
      )
    } catch (err) {
      result.errors++
      result.messages.push(
        `${row.signal_id}: exception — ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return result
}
