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
