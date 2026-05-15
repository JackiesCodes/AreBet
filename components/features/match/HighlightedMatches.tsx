"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { scoreAndRankMatches } from "@/lib/utils/highlight-engine"
import { fetchEditorialBoosts } from "@/lib/services/highlights"
import type { MatchPopularity } from "@/lib/utils/highlight-engine"
import { MatchCard } from "./MatchCard"

const SPOTLIGHT_LIMIT    = 5
const BOOST_REFRESH_MS   = 5 * 60_000
const POPULAR_REFRESH_MS = 2 * 60_000

export function HighlightedMatches() {
  const { matches, loading, latestChangeMap } = useMatchIntelligence()

  const [boosts, setBoosts] = useState<Map<number, { score: number; label: string | null }>>(new Map())
  const boostTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [popularityMap, setPopularityMap] = useState<Map<number, MatchPopularity>>(new Map())
  const popularTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIdsRef = useRef<string>("")

  useEffect(() => {
    const load = () => fetchEditorialBoosts().then(setBoosts)
    load()
    boostTimerRef.current = setInterval(load, BOOST_REFRESH_MS)
    return () => { if (boostTimerRef.current) clearInterval(boostTimerRef.current) }
  }, [])

  useEffect(() => {
    if (matches.length === 0) return
    const ids = matches.map((m) => m.id).sort().join(",")
    if (ids === prevIdsRef.current) return
    prevIdsRef.current = ids

    const loadPopularity = async () => {
      try {
        const res = await fetch(`/api/highlights?limit=20`)
        if (!res.ok) return
        const data: { highlights: Array<{ id: number; popularity: MatchPopularity }> } = await res.json()
        const map = new Map<number, MatchPopularity>()
        for (const h of data.highlights) {
          if (h.popularity) map.set(h.id, h.popularity)
        }
        if (map.size > 0) setPopularityMap(map)
      } catch { /* graceful */ }
    }
    loadPopularity()

    if (popularTimerRef.current) clearInterval(popularTimerRef.current)
    popularTimerRef.current = setInterval(loadPopularity, POPULAR_REFRESH_MS)
    return () => { if (popularTimerRef.current) clearInterval(popularTimerRef.current) }
  }, [matches])

  const highlighted = useMemo(() => {
    if (matches.length === 0) return []
    return scoreAndRankMatches(matches, boosts, popularityMap)
      .filter((m) => m.status !== "FINISHED")
      .slice(0, SPOTLIGHT_LIMIT)
  }, [matches, boosts, popularityMap])

  if (!loading && highlighted.length === 0) return null

  return (
    <section className="spotlight-section" aria-label="Spotlight matches">
      <div className="spotlight-header">
        <h2 className="spotlight-title">Spotlight</h2>
        <span className="spotlight-sub">Top picks for today</span>
      </div>

      <div className="spotlight-rail">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="cc-card cc-card--skeleton" aria-hidden>
                <div className="skel-line skel-line--short" />
                <div className="skel-line skel-line--teams" />
                <div className="skel-line skel-line--medium" />
              </div>
            ))
          : highlighted.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                latestChange={latestChangeMap.get(m.id)}
              />
            ))
        }
      </div>
    </section>
  )
}
