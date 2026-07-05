"use client"

import { useEffect, useState } from "react"
import type { OddsQuoteWithSnapshot } from "@/lib/services/odds-snapshot"

export interface MatchWinnerOdds {
  home?: OddsQuoteWithSnapshot
  draw?: OddsQuoteWithSnapshot
  away?: OddsQuoteWithSnapshot
}

/**
 * Fetches MATCH_WINNER odds (with their locked-in snapshot ids) for a
 * single fixture from the odds provider adapter, replacing the previous
 * reliance on API-Football's own odds passthrough (lib/services/matches.ts
 * enrichWithOdds) for anything that feeds a real bet placement.
 */
export function useMatchWinnerOdds(
  fixtureId: number,
  enabled = true
): { odds: MatchWinnerOdds; loading: boolean } {
  const [odds, setOdds] = useState<MatchWinnerOdds>({})
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)

    fetch(`/api/odds/${fixtureId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { quotes: OddsQuoteWithSnapshot[] } | null) => {
        if (cancelled || !json) return
        const winner = json.quotes.filter((q) => q.marketCode === "MATCH_WINNER")
        setOdds({
          home: winner.find((q) => q.selectionCode === "HOME"),
          draw: winner.find((q) => q.selectionCode === "DRAW"),
          away: winner.find((q) => q.selectionCode === "AWAY"),
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fixtureId, enabled])

  return { odds, loading }
}
