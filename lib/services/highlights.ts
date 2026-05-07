/**
 * Highlights service — all DB access for the highlight engine.
 *
 * READ paths:
 *   fetchEditorialBoosts()   — public anon client, SELECT only
 *   fetchMatchPopularity()   — server-side service client (aggregates private tables)
 *
 * WRITE paths (server route handlers only):
 *   upsertEditorialBoost()   — service client, admin-only
 *   deleteEditorialBoost()   — service client, admin-only
 *   listEditorialBoosts()    — service client, admin panel
 */

import { createClient } from "@/lib/supabase/client"
import type { MatchPopularity } from "@/lib/utils/highlight-engine"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditorialBoost {
  fixture_id:  number
  score:       number        // 0-1
  label:       string | null // "Top Pick" | "Derby" | "Final" | "Editor's Choice" | null
  expires_at:  string | null // ISO timestamp or null (never expires)
}

export interface EditorialBoostRow extends EditorialBoost {
  id:         number
  home_team:  string | null
  away_team:  string | null
  created_at: string
}

// ── Public reads (anon client, subject to RLS) ────────────────────────────────

/**
 * Fetch all active editorial boosts (public, no auth required).
 * Expired boosts are excluded via server-side filter.
 * Returns a Map<fixtureId, boost> for O(1) lookup in the engine.
 */
export async function fetchEditorialBoosts(): Promise<Map<number, { score: number; label: string | null }>> {
  try {
    const supabase = createClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("editorial_boosts")
      .select("fixture_id, score, label, expires_at")
      .or(`expires_at.is.null,expires_at.gt.${now}`)

    if (error || !data) return new Map()

    return new Map(
      (data as EditorialBoost[]).map((row) => [
        row.fixture_id,
        { score: row.score, label: row.label },
      ]),
    )
  } catch {
    return new Map()
  }
}

// ── Server-only reads (service client, called from route handlers) ────────────

/**
 * Aggregate popularity data for a set of fixture IDs.
 * Uses the service-role client to bypass RLS on user_bets and favorites.
 * Returns a Map<fixtureId, MatchPopularity> — always returns a value for every ID.
 *
 * Call this from route handlers ONLY — never from client components.
 */
export async function fetchMatchPopularity(
  fixtureIds: number[],
): Promise<Map<number, MatchPopularity>> {
  const empty = new Map<number, MatchPopularity>(
    fixtureIds.map((id) => [id, { betCount: 0, favoriteCount: 0 }]),
  )
  if (fixtureIds.length === 0) return empty

  // Dynamic import: keeps service client out of the browser bundle
  const { createServiceClient } = await import("@/lib/supabase/service")

  try {
    const supabase = createServiceClient()
    const idStrings = fixtureIds.map(String)

    // Two parallel batch queries — much cheaper than N individual queries
    const [betResult, favResult] = await Promise.allSettled([
      supabase
        .from("user_bets")
        .select("fixture_id")
        .in("fixture_id", fixtureIds),
      supabase
        .from("favorites")
        .select("entity_id")
        .eq("entity_type", "match")
        .in("entity_id", idStrings),
    ])

    if (betResult.status === "fulfilled" && betResult.value.data) {
      for (const row of betResult.value.data) {
        const entry = empty.get(row.fixture_id)
        if (entry) entry.betCount++
      }
    }

    if (favResult.status === "fulfilled" && favResult.value.data) {
      for (const row of favResult.value.data) {
        const id = parseInt(row.entity_id, 10)
        if (Number.isFinite(id)) {
          const entry = empty.get(id)
          if (entry) entry.favoriteCount++
        }
      }
    }
  } catch {
    // Graceful degradation — engine still works with zero popularity counts
  }

  return empty
}

// ── Admin reads ───────────────────────────────────────────────────────────────

/**
 * List all editorial boosts for the admin panel.
 * Server-only — requires service-role key.
 */
export async function listEditorialBoosts(): Promise<EditorialBoostRow[]> {
  const { createServiceClient } = await import("@/lib/supabase/service")
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("editorial_boosts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error || !data) return []
    return data as EditorialBoostRow[]
  } catch {
    return []
  }
}

// ── Admin writes (route handlers only) ───────────────────────────────────────

export interface UpsertBoostInput {
  fixture_id:  number
  score:       number
  label:       string | null
  expires_at:  string | null
  home_team?:  string | null
  away_team?:  string | null
  kickoff_at?: string
}

export async function upsertEditorialBoost(
  input: UpsertBoostInput,
): Promise<{ ok: boolean; error?: string }> {
  const { createServiceClient } = await import("@/lib/supabase/service")
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from("editorial_boosts")
      .upsert(input, { onConflict: "fixture_id" })

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteEditorialBoost(
  fixture_id: number,
): Promise<{ ok: boolean; error?: string }> {
  const { createServiceClient } = await import("@/lib/supabase/service")
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from("editorial_boosts")
      .delete()
      .eq("fixture_id", fixture_id)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
