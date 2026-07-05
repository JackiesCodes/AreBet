"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMatchFeedCtx } from "@/contexts/MatchFeedContext"
import { OddsButton } from "@/components/features/betslip/OddsButton"
import { useMatchWinnerOdds } from "@/hooks/useMatchWinnerOdds"
import type { Match } from "@/types/match"

export function PopularMarkets() {
  const { matches, loading } = useMatchFeedCtx()

  const marketMatches = useMemo(() => {
    return matches
      .filter((m) => m.status === "UPCOMING")
      .sort((a, b) => new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime())
      .slice(0, 6)
  }, [matches])

  if (!loading && marketMatches.length === 0) return null

  return (
    <section className="popular-markets" aria-label="Popular markets">
      <div className="popular-markets-header">
        <h2 className="popular-markets-title">Popular Markets</h2>
        <span className="popular-markets-sub">1X2 — Match Winner</span>
      </div>

      <div className="popular-markets-list">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="popular-markets-row popular-markets-row--skeleton" aria-hidden>
                <div className="skel-line skel-line--medium" />
                <div className="skel-line skel-line--short" />
              </div>
            ))
          : marketMatches.map((m) => <PopularMarketRow key={m.id} match={m} />)}
      </div>
    </section>
  )
}

function PopularMarketRow({ match: m }: { match: Match }) {
  const router = useRouter()
  const { odds } = useMatchWinnerOdds(m.id)

  if (!odds.home || !odds.away) return null

  return (
    <div
      className="popular-markets-row"
      onClick={() => router.push(`/match/${m.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          router.push(`/match/${m.id}`)
        }
      }}
      aria-label={`${m.home.name} vs ${m.away.name} — click to view match`}
    >
      <div className="popular-markets-match-info">
        <span className="popular-markets-league">{m.league}</span>
        <span className="popular-markets-teams">
          {m.home.name} <span className="popular-markets-vs">vs</span> {m.away.name}
        </span>
      </div>
      <div
        className="popular-markets-odds"
        onClick={(e) => e.stopPropagation()}
        role="group"
        aria-label="1X2 odds"
      >
        <OddsButton
          fixtureId={m.id}
          matchLabel={`${m.home.name} vs ${m.away.name}`}
          league={m.league}
          market="MATCH_WINNER"
          marketLabel="Match Winner"
          selection="HOME"
          selectionLabel={m.home.short || "Home"}
          odds={odds.home.odds}
          oddsSnapshotId={odds.home.snapshotId}
          kickoffISO={m.kickoffISO}
        />
        {odds.draw && (
          <OddsButton
            fixtureId={m.id}
            matchLabel={`${m.home.name} vs ${m.away.name}`}
            league={m.league}
            market="MATCH_WINNER"
            marketLabel="Match Winner"
            selection="DRAW"
            selectionLabel="Draw"
            odds={odds.draw.odds}
            oddsSnapshotId={odds.draw.snapshotId}
            kickoffISO={m.kickoffISO}
          />
        )}
        <OddsButton
          fixtureId={m.id}
          matchLabel={`${m.home.name} vs ${m.away.name}`}
          league={m.league}
          market="MATCH_WINNER"
          marketLabel="Match Winner"
          selection="AWAY"
          selectionLabel={m.away.short || "Away"}
          odds={odds.away.odds}
          oddsSnapshotId={odds.away.snapshotId}
          kickoffISO={m.kickoffISO}
        />
      </div>
    </div>
  )
}
