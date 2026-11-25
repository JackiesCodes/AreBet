"use client"

import { useEffect, useState } from "react"
import type { OddsQuoteWithSnapshot } from "@/lib/services/odds-snapshot"

/** All quotes keyed by `${marketCode}:${selectionCode}` */
export type OddsMap = Map<string, OddsQuoteWithSnapshot>

export function useAllOdds(
  fixtureId: number,
  enabled = true
): { oddsMap: OddsMap; loading: boolean } {
  const [oddsMap, setOddsMap] = useState<OddsMap>(new Map())
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)

    fetch(`/api/odds/${fixtureId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { quotes: OddsQuoteWithSnapshot[] } | null) => {
        if (cancelled || !json) return
        const map: OddsMap = new Map()
        for (const q of json.quotes) {
          map.set(`${q.marketCode}:${q.selectionCode}`, q)
        }
        setOddsMap(map)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [fixtureId, enabled])

  return { oddsMap, loading }
}
