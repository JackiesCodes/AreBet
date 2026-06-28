"use client"

import { useMemo } from "react"
import { useMatchFeedCtx } from "@/contexts/MatchFeedContext"
import { MatchCard } from "./MatchCard"

export function HighlightedMatches() {
  const { matches, loading } = useMatchFeedCtx()

  const featured = useMemo(() => {
    const live = matches.filter((m) => m.status === "LIVE").slice(0, 2)
    const upcoming = matches
      .filter((m) => m.status === "UPCOMING" && m.odds?.home != null)
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime())
      .slice(0, Math.max(0, 4 - live.length))
    return [...live, ...upcoming]
  }, [matches])

  if (!loading && featured.length === 0) return null

  return (
    <section className="spotlight-section" aria-label="Featured events">
      <div className="spotlight-header">
        <h2 className="spotlight-title">Featured Events</h2>
        <span className="spotlight-sub">Top matches available now</span>
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
          : featured.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
              />
            ))
        }
      </div>
    </section>
  )
}
