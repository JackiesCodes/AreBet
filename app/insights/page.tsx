"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardTitle, CardSubtitle } from "@/components/primitives/Card"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { generateFeedTips, type FeedTip } from "@/lib/utils/betting-tips"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { formatTime } from "@/lib/utils/time"
import type { ApiPlayerStat } from "@/lib/api-football/types"

// ── League map ────────────────────────────────────────────────────────────────

const LEAGUE_NAMES: Record<number, string> = {
  39: "Premier League",
  140: "La Liga",
  135: "Serie A",
  78: "Bundesliga",
  61: "Ligue 1",
}
const LEAGUE_IDS = [39, 140, 135, 78, 61]

// ── Value Board ───────────────────────────────────────────────────────────────

function ValueBoardCard({ tip, fmt }: { tip: FeedTip; fmt: (n: number) => string }) {
  const pct = Math.round(tip.probability * 100)
  return (
    <Link href={`/match/${tip.matchId}`} className="vb-card">
      <div className="vb-card-top">
        {tip.isValue && (
          <span className="vb-edge">▲ +{(tip.edge * 100).toFixed(1)}%</span>
        )}
        <span className={`vb-conf-badge vb-conf-badge--${tip.confidence}`}>{pct}%</span>
      </div>
      <div className="vb-match">{tip.home} <span className="vb-vs">vs</span> {tip.away}</div>
      <div className="vb-selection">{tip.selection}</div>
      <div className="vb-card-footer">
        <span className="vb-league">{tip.league}</span>
        <div className="vb-right">
          {tip.status === "LIVE"
            ? <span className="vb-live-dot">● LIVE</span>
            : <span className="vb-time">{formatTime(tip.kickoffISO)}</span>
          }
          {tip.odds > 0 && <span className="vb-odds">{fmt(tip.odds)}</span>}
        </div>
      </div>
      <div className="vb-bar-wrap">
        <div className="vb-bar" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  )
}

function ValueBoardSection() {
  const { matches, loading } = useMatchIntelligence()
  const fmt = useFormatOdds()
  const [showAll, setShowAll] = useState(false)

  const valueTips = useMemo(() => {
    const tips = generateFeedTips(matches)
    const value    = tips.filter((t) => t.isValue).sort((a, b) => b.edge - a.edge)
    const highConf = tips.filter((t) => !t.isValue && t.confidence === "high").sort((a, b) => b.probability - a.probability)
    return [...value, ...highConf]
  }, [matches])

  const displayed = showAll ? valueTips : valueTips.slice(0, 6)

  return (
    <div className="vb-section">
      <div className="vb-header">
        <div>
          <h2 className="vb-title">⚡ Value Board</h2>
          <p className="vb-subtitle">
            Best edges &amp; high-confidence tips across today&rsquo;s fixtures
          </p>
        </div>
        {valueTips.length > 0 && (
          <div className="vb-meta">
            <span className="vb-count">{valueTips.filter((t) => t.isValue).length} value</span>
            <span className="vb-count-sep">·</span>
            <span className="vb-count">{valueTips.filter((t) => t.confidence === "high").length} high-conf</span>
          </div>
        )}
      </div>

      {loading && <Skeleton variant="list" count={3} />}

      {!loading && valueTips.length === 0 && (
        <EmptyState
          title="No value tips yet today"
          text="Value tips appear when the model finds a 5%+ edge against the market. Check back after odds are posted."
        />
      )}

      {!loading && valueTips.length > 0 && (
        <>
          <div className="vb-grid">
            {displayed.map((t) => (
              <ValueBoardCard key={`${t.matchId}-${t.id}`} tip={t} fmt={fmt} />
            ))}
          </div>
          {valueTips.length > 6 && (
            <button
              type="button"
              className="md-btn md-btn--ghost md-btn--sm vb-show-more"
              onClick={() => setShowAll((s) => !s)}
            >
              {showAll ? "Show less" : `Show ${valueTips.length - 6} more`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Top scorers section ───────────────────────────────────────────────────────

interface LeagueScorers {
  leagueId: number
  players: ApiPlayerStat[]
}

function TopScorersSection() {
  const [data, setData]           = useState<LeagueScorers[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeLeague, setActiveLeague] = useState(39)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/players/topscorers")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as { topScorers: LeagueScorers[] | ApiPlayerStat[] }
        if (Array.isArray(json.topScorers) && json.topScorers.length > 0 && "leagueId" in json.topScorers[0]) {
          setData(json.topScorers as LeagueScorers[])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const activeData = data.find((d) => d.leagueId === activeLeague)?.players ?? []

  return (
    <Card>
      <CardTitle>Top Scorers</CardTitle>
      <CardSubtitle>Golden Boot race across the top 5 leagues</CardSubtitle>

      <div style={{ display: "flex", gap: 6, margin: "12px 0", flexWrap: "wrap" }}>
        {LEAGUE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveLeague(id)}
            className={activeLeague === id ? "md-btn md-btn--primary md-btn--sm" : "md-btn md-btn--ghost md-btn--sm"}
            style={{ fontSize: 11 }}
          >
            {LEAGUE_NAMES[id]}
          </button>
        ))}
      </div>

      {loading && <Skeleton variant="list" count={5} />}
      {error && <div className="admin-warn-box">{error}</div>}
      {!loading && !error && activeData.length === 0 && (
        <EmptyState title="No data" text="Top scorer data not yet available for this league." />
      )}

      {!loading && activeData.length > 0 && (
        <div className="md-table-wrap"><table className="md-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Player</th>
              <th>Team</th>
              <th title="Goals">G</th>
              <th title="Assists">A</th>
              <th title="Appearances">Apps</th>
              <th title="Rating">Rtg</th>
            </tr>
          </thead>
          <tbody>
            {activeData.map((p, i) => {
              const stats = p.statistics[0]
              return (
                <tr key={p.player.id}>
                  <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{p.player.name}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{stats?.team.name ?? "—"}</td>
                  <td><strong>{stats?.goals.total ?? 0}</strong></td>
                  <td>{stats?.goals.assists ?? 0}</td>
                  <td style={{ color: "var(--text-muted)" }}>{stats?.games.appearences ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {stats?.games.rating ? parseFloat(stats.games.rating).toFixed(1) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      )}
    </Card>
  )
}

// ── Form leaders section ──────────────────────────────────────────────────────

interface TeamFormEntry {
  name: string
  league: string
  form: string
  wins: number
  draws: number
  losses: number
}

function formScore(form: string): number {
  return form.split("").reduce((acc: number, c: string) => acc + (c === "W" ? 3 : c === "D" ? 1 : 0), 0)
}

function FormLeadersSection() {
  const { matches, loading } = useMatchIntelligence()

  const leaders: TeamFormEntry[] = (() => {
    const map = new Map<string, TeamFormEntry>()
    for (const m of matches) {
      for (const side of ["home", "away"] as const) {
        const team = m[side]
        if (!team.form || team.form.length === 0) continue
        if (!map.has(team.name)) {
          const chars = team.form.split("")
          map.set(team.name, {
            name: team.name,
            league: m.league,
            form: team.form,
            wins:   chars.filter((c) => c === "W").length,
            draws:  chars.filter((c) => c === "D").length,
            losses: chars.filter((c) => c === "L").length,
          })
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => formScore(b.form) - formScore(a.form))
      .slice(0, 20)
  })()

  return (
    <Card>
      <CardTitle>Form Leaders</CardTitle>
      <CardSubtitle>Teams on the best recent run (last 5 matches)</CardSubtitle>

      {loading && <Skeleton variant="list" count={5} />}
      {!loading && leaders.length === 0 && (
        <EmptyState title="No form data" text="Form data will appear once match results have been recorded." />
      )}
      {!loading && leaders.length > 0 && (
        <div className="md-table-wrap"><table className="md-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Team</th>
              <th>League</th>
              <th title="Last 5 form">Form</th>
              <th title="Points from last 5">Pts</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((t, i) => (
              <tr key={t.name}>
                <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{t.name}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.league}</td>
                <td>
                  <span style={{ display: "flex", gap: 2 }}>
                    {t.form.split("").map((c, j) => (
                      <span
                        key={j}
                        style={{
                          width: 14, height: 14, borderRadius: 3,
                          background: c === "W" ? "var(--positive)" : c === "D" ? "var(--warning)" : "var(--negative)",
                          opacity: 0.85, display: "inline-block",
                        }}
                        title={c === "W" ? "Win" : c === "D" ? "Draw" : "Loss"}
                      />
                    ))}
                  </span>
                </td>
                <td><strong>{formScore(t.form)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </Card>
  )
}

// ── Injury watch section ──────────────────────────────────────────────────────

interface InjuryEntry {
  matchLabel: string
  playerName: string
  team: string
  type: string
  reason: string
}

function InjuryWatchSection() {
  const { matches } = useMatchIntelligence()
  const [injuries, setInjuries]   = useState<InjuryEntry[]>([])
  const [loading, setLoading]     = useState(false)
  const [fetched, setFetched]     = useState(false)

  const loadInjuries = useCallback(async () => {
    const upcoming = matches.filter((m) => m.status === "UPCOMING").slice(0, 6)
    if (upcoming.length === 0) return
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        upcoming.map((m) =>
          fetch(`/api/injuries?fixture=${m.id}`)
            .then((r) => r.json())
            .then((d) => ({ match: m, injuries: d.injuries ?? [] }))
        )
      )
      const entries: InjuryEntry[] = []
      for (const r of results) {
        if (r.status === "fulfilled") {
          const { match, injuries: injs } = r.value as { match: typeof upcoming[0]; injuries: Array<{ player: { name: string; type: string; reason: string }; team: { name: string } }> }
          for (const inj of injs) {
            entries.push({
              matchLabel: `${match.home.name} vs ${match.away.name}`,
              playerName: inj.player.name,
              team: inj.team.name,
              type: inj.player.type,
              reason: inj.player.reason,
            })
          }
        }
      }
      setInjuries(entries)
    } finally {
      setLoading(false)
      setFetched(true)
    }
  }, [matches])

  useEffect(() => { if (matches.length > 0 && !fetched) void loadInjuries() }, [matches, fetched, loadInjuries])

  return (
    <Card>
      <CardTitle>Injury Watch</CardTitle>
      <CardSubtitle>Missing and doubtful players for upcoming fixtures</CardSubtitle>

      {loading && <Skeleton variant="list" count={4} />}
      {!loading && fetched && injuries.length === 0 && (
        <EmptyState title="No injuries reported" text="No injury reports for upcoming fixtures." />
      )}
      {!loading && injuries.length > 0 && (
        <div className="md-table-wrap"><table className="md-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Team</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Match</th>
            </tr>
          </thead>
          <tbody>
            {injuries.map((inj, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{inj.playerName}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{inj.team}</td>
                <td>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                    background: inj.type === "Missing Fixture" ? "rgba(255,68,68,0.12)" : "rgba(245,158,11,0.12)",
                    color: inj.type === "Missing Fixture" ? "var(--negative)" : "var(--warning)",
                  }}>
                    {inj.type}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{inj.reason || "—"}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{inj.matchLabel}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  return (
    <div className="md-page">
      <PageHeader
        title="Intelligence"
        subtitle="Value board, top scorers, form leaders, and injury watch"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <ValueBoardSection />
        <TopScorersSection />
        <div className="insights-sections-grid">
          <FormLeadersSection />
          <InjuryWatchSection />
        </div>
      </div>
    </div>
  )
}
