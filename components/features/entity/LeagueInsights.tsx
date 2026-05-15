"use client"

import { useMemo } from "react"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { calculateValueEdge } from "@/lib/utils/value-bet"

interface LeagueInsightsProps {
  leagueId: number
  leagueName: string
}

export function LeagueInsights({ leagueId, leagueName }: LeagueInsightsProps) {
  const { matches } = useMatchIntelligence()

  const leagueMatches = useMemo(
    () => matches.filter((m) => m.leagueId === leagueId && m.status !== "FINISHED"),
    [matches, leagueId],
  )

  const cards = useMemo(() => {
    const result: { icon: string; title: string; text: string }[] = []

    // Hot streak team in this league
    let bestStreak: { name: string; wins: number } | null = null
    for (const m of leagueMatches) {
      for (const side of ["home", "away"] as const) {
        const form = m[side].form
        if (!form) continue
        const wins = (form.match(/W/g) ?? []).length
        if (!bestStreak || wins > bestStreak.wins) bestStreak = { name: m[side].name, wins }
      }
    }
    if (bestStreak && bestStreak.wins >= 3) {
      result.push({ icon: "🔥", title: "Hot Streak", text: `${bestStreak.name} — ${bestStreak.wins}W in last 5` })
    }

    // Best value pick in this league
    let bestValue: { label: string; edge: number } | null = null
    for (const m of leagueMatches.filter((x) => x.status === "UPCOMING")) {
      const edge = calculateValueEdge(m)
      if (edge?.isValue && (!bestValue || edge.edge > bestValue.edge)) {
        bestValue = { label: `${m.home.name} vs ${m.away.name}`, edge: edge.edge }
      }
    }
    if (bestValue) {
      result.push({ icon: "💰", title: "Value Pick", text: `${bestValue.label} · +${(bestValue.edge * 100).toFixed(0)}% edge` })
    }

    // Live match count
    const liveCount = leagueMatches.filter((m) => m.status === "LIVE").length
    if (liveCount > 0) {
      result.push({ icon: "🔴", title: "Live Now", text: `${liveCount} match${liveCount > 1 ? "es" : ""} in progress` })
    }

    // Upcoming count
    const upcomingCount = leagueMatches.filter((m) => m.status === "UPCOMING").length
    if (upcomingCount > 0) {
      result.push({ icon: "📅", title: "Upcoming", text: `${upcomingCount} match${upcomingCount > 1 ? "es" : ""} scheduled` })
    }

    return result.slice(0, 3)
  }, [leagueMatches])

  return (
    <div>
      <div className="rp-section-title">{leagueName} Insights</div>
      {cards.length === 0 ? (
        <div className="rp-empty">No insights available for this league</div>
      ) : (
        cards.map((card) => (
          <div key={card.title} className="rp-insight-card">
            <span className="rp-insight-icon" aria-hidden>{card.icon}</span>
            <div>
              <div className="rp-insight-title">{card.title}</div>
              <div className="rp-insight-text">{card.text}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
