"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { calculateValueEdge } from "@/lib/utils/value-bet"
import type { ApiStandingRow, ApiPlayerStat } from "@/lib/api-football/types"

// ── Live ticker ───────────────────────────────────────────────────────────────

const LIVE_INITIAL = 2

function LiveTicker() {
  const { matches } = useMatchIntelligence()
  const [expanded, setExpanded] = useState(false)
  const live = useMemo(() => matches.filter((m) => m.status === "LIVE"), [matches])
  const visible = expanded ? live : live.slice(0, LIVE_INITIAL)
  const hidden = live.length - LIVE_INITIAL

  if (live.length === 0) {
    return <div className="rp-empty">No live matches right now</div>
  }

  return (
    <div className="rp-ticker">
      {visible.map((m) => (
        <Link key={m.id} href={`/match/${m.id}`} className="rp-ticker-item">
          <div className="rp-ticker-header">
            <span className="rp-ticker-minute">
              <span className="rp-live-pip" aria-hidden />
              {m.minute ?? 0}&apos;
            </span>
            <span className="rp-ticker-league">{m.league}</span>
          </div>
          <div className="rp-ticker-row">
            <span className="rp-ticker-team">{m.home.name}</span>
            <span className="rp-ticker-score">{m.score.home} – {m.score.away}</span>
            <span className="rp-ticker-team rp-ticker-team--away">{m.away.name}</span>
          </div>
        </Link>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className="rp-ticker-toggle"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  )
}

// ── Mini standings ────────────────────────────────────────────────────────────

const STANDING_LEAGUES: [number, string][] = [
  [39, "PL"],
  [140, "La Liga"],
  [135, "Serie A"],
  [78, "Bundesliga"],
  [61, "Ligue 1"],
]

const STANDINGS_INITIAL = 3

function MiniStandings() {
  const [leagueId, setLeagueId] = useState(39)
  const [rows, setRows] = useState<ApiStandingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setExpanded(false)
    fetch(`/api/standings?league=${leagueId}`)
      .then((r) => r.json())
      .then((d) => {
        const league = d.standings?.[0]?.league
        setRows(league?.standings?.[0] ?? [])
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [leagueId])

  const leagueName = STANDING_LEAGUES.find(([id]) => id === leagueId)?.[1] ?? "League"
  const visible = expanded ? rows : rows.slice(0, STANDINGS_INITIAL)
  const hidden = rows.length - STANDINGS_INITIAL

  return (
    <div>
      <div className="rp-standings-tabs">
        {STANDING_LEAGUES.map(([id, name]) => (
          <button
            key={id}
            type="button"
            className={`rp-standings-tab ${leagueId === id ? "rp-standings-tab--active" : ""}`}
            onClick={() => setLeagueId(id)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="rp-section-title">{leagueName} Top {expanded ? rows.length : STANDINGS_INITIAL}</div>

      {loading && <div className="rp-loading">Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="rp-empty">No standings data</div>
      )}

      {visible.map((row, i) => (
        <div key={row.team.id} className="rp-standings-row">
          <span className="rp-standings-rank">{i + 1}</span>
          <span className="rp-standings-team">{row.team.name}</span>
          <span className="rp-standings-pts">{row.points} pts</span>
          <span className={`rp-standings-gd ${row.goalsDiff > 0 ? "rp-standings-gd--pos" : ""}`}>
            {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
          </span>
        </div>
      ))}

      {!loading && hidden > 0 && (
        <button
          type="button"
          className="rp-ticker-toggle"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  )
}

// ── Today's Insights ──────────────────────────────────────────────────────────

function TodayInsights() {
  const { matches } = useMatchIntelligence()
  const [topScorer, setTopScorer] = useState<ApiPlayerStat | null>(null)

  useEffect(() => {
    fetch("/api/players/topscorers?league=39")
      .then((r) => r.json())
      .then((d) => {
        const list = d.topScorers as ApiPlayerStat[]
        setTopScorer(list?.[0] ?? null)
      })
      .catch(() => null)
  }, [])

  const hotStreak = useMemo(() => {
    let best: { name: string; wins: number } | null = null
    for (const m of matches) {
      for (const side of ["home", "away"] as const) {
        const form = m[side].form
        if (!form) continue
        const wins = (form.match(/W/g) ?? []).length
        if (!best || wins > best.wins) best = { name: m[side].name, wins }
      }
    }
    return best && best.wins >= 3 ? best : null
  }, [matches])

  const topValue = useMemo(() => {
    let best: { label: string; edge: number } | null = null
    for (const m of matches.filter((x) => x.status === "UPCOMING")) {
      const edge = calculateValueEdge(m)
      if (edge?.isValue && (!best || edge.edge > best.edge)) {
        best = {
          label: `${m.home.name} vs ${m.away.name}`,
          edge: edge.edge,
        }
      }
    }
    return best
  }, [matches])

  const cards = [
    hotStreak && {
      icon: "🔥",
      title: "Hot Streak",
      text: `${hotStreak.name} — ${hotStreak.wins}W in last 5`,
    },
    topValue && {
      icon: "💰",
      title: "Value Alert",
      text: `${topValue.label} · +${(topValue.edge * 100).toFixed(0)}% edge`,
    },
    topScorer && {
      icon: "⚽",
      title: "Top Scorer",
      text: `${topScorer.player.name} · ${topScorer.statistics[0]?.goals.total ?? 0} goals`,
    },
  ].filter(Boolean) as { icon: string; title: string; text: string }[]

  if (cards.length === 0) return null

  return (
    <div>
      <div className="rp-section-title">Today&apos;s Insights</div>
      {cards.map((card) => (
        <div key={card.title} className="rp-insight-card">
          <span className="rp-insight-icon" aria-hidden>{card.icon}</span>
          <div>
            <div className="rp-insight-title">{card.title}</div>
            <div className="rp-insight-text">{card.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function RightPanel() {
  const { matches } = useMatchIntelligence()
  const liveCount = useMemo(() => matches.filter((m) => m.status === "LIVE").length, [matches])

  return (
    <aside className="app-right">
      <div className="rp-header">
        <span className="rp-header-title">Live Analytics</span>
        <span className="rp-header-badge" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </span>
      </div>

      <div className="rp-section">
        <div className="rp-section-title">
          <span className="rp-live-dot" aria-hidden />
          Live Now
          <span className="rp-live-count">{liveCount} total</span>
        </div>
        <LiveTicker />
      </div>

      <div className="rp-section rp-section--standings">
        <MiniStandings />
      </div>

      <div className="rp-section">
        <TodayInsights />
      </div>
    </aside>
  )
}
