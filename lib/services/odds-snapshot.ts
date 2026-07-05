import { createServiceClient } from "@/lib/supabase/service"
import { getOddsProvider } from "@/lib/providers/odds"
import type { OddsMarketCode } from "@/lib/providers/odds"

export interface OddsQuoteWithSnapshot {
  marketCode: OddsMarketCode
  marketLabel: string
  selectionCode: string
  selectionLabel: string
  odds: number
  snapshotId: string
}

const SNAPSHOT_CACHE_TTL_MS = 15_000
const snapshotCache = new Map<number, { quotes: OddsQuoteWithSnapshot[]; expiresAt: number }>()

/**
 * Fetches quotes from the odds provider and records each one as an
 * odds_snapshots row before returning it. This is what "locking in odds"
 * means: a bet placed against a specific snapshotId always resolves to
 * the odds value stored here, never a live/mutable value — closing the
 * gap where app/api/bets/place previously trusted a client-submitted
 * `odds` number verbatim.
 *
 * Results are cached in-memory per fixture for a short window so that
 * repeated UI renders/polls of the same fixture don't insert a fresh
 * odds_snapshots row on every request — a real odds feed would push
 * updates on its own cadence; this mimics that without spamming inserts.
 */
export async function getAndSnapshotOdds(fixtureId: number): Promise<OddsQuoteWithSnapshot[]> {
  const cached = snapshotCache.get(fixtureId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quotes
  }

  const provider = getOddsProvider()
  const quotes = await provider.getOddsForFixture(fixtureId)
  if (quotes.length === 0) return []

  const supabase = createServiceClient()

  const marketCodes = Array.from(new Set(quotes.map((q) => q.marketCode)))
  const marketRows = marketCodes.map((code) => {
    const sample = quotes.find((q) => q.marketCode === code)!
    return {
      provider: provider.id,
      fixture_id: fixtureId,
      market_code: code,
      market_label: sample.marketLabel,
    }
  })

  const { data: markets, error: marketError } = await supabase
    .from("markets")
    .upsert(marketRows, { onConflict: "provider,fixture_id,market_code" })
    .select("id, market_code")

  if (marketError || !markets) {
    throw new Error(`Failed to upsert markets: ${marketError?.message}`)
  }

  const marketIdByCode = new Map<string, string>(markets.map((m) => [m.market_code, m.id]))

  const snapshotRows = quotes.map((q) => ({
    market_id: marketIdByCode.get(q.marketCode),
    selection_code: q.selectionCode,
    selection_label: q.selectionLabel,
    odds: q.odds,
    provider_quote_id: q.providerQuoteId,
  }))

  const { data: snapshots, error: snapshotError } = await supabase
    .from("odds_snapshots")
    .insert(snapshotRows)
    .select("id, market_id, selection_code")

  if (snapshotError || !snapshots) {
    throw new Error(`Failed to insert odds snapshots: ${snapshotError?.message}`)
  }

  const result = quotes.map((q) => {
    const marketId = marketIdByCode.get(q.marketCode)
    const snapshot = snapshots.find(
      (s) => s.market_id === marketId && s.selection_code === q.selectionCode
    )
    return {
      marketCode: q.marketCode,
      marketLabel: q.marketLabel,
      selectionCode: q.selectionCode,
      selectionLabel: q.selectionLabel,
      odds: q.odds,
      snapshotId: snapshot!.id,
    }
  })

  snapshotCache.set(fixtureId, { quotes: result, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS })
  return result
}

/**
 * Looks up a single, already-captured odds snapshot by id and confirms it
 * matches the fixture/market/selection a bet claims to be for. Used by
 * bet placement to verify the client isn't submitting a snapshot id that
 * doesn't correspond to what it claims.
 */
export async function verifyOddsSnapshot(params: {
  snapshotId: string
  fixtureId: number
  marketCode: string
  selectionCode: string
}): Promise<{ odds: number } | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("odds_snapshots")
    .select("odds, markets!inner(fixture_id, market_code)")
    .eq("id", params.snapshotId)
    .eq("selection_code", params.selectionCode)
    .single()

  if (error || !data) return null

  const market = Array.isArray(data.markets) ? data.markets[0] : data.markets
  if (!market || market.fixture_id !== params.fixtureId || market.market_code !== params.marketCode) {
    return null
  }

  return { odds: data.odds }
}
