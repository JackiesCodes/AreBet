"use client"

import { useCallback, useEffect, useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardTitle, CardSubtitle } from "@/components/primitives/Card"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { useMatchFeed } from "@/hooks/useMatchFeed"
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

// ── Top scorers section ───────────────────────────────────────────────────────

interface LeagueScorers {
  leagueId: number
  players: ApiPlayerStat[]
}

function TopScorersSection() {
  const [data, setData] = useState<LeagueScorers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeLeague, setActiveLeague] = useState(39)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/players/topscorers")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as { topScorers: LeagueScorers[] | ApiPlayerStat[] }
        if (Array.isArray(json.topScorers)) {
          // Grouped by league
          if (json.topScorers.length > 0 && "leagueId" in json.topScorers[0]) {
            setData(json.topScorers as LeagueScorers[])
          }
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

      {/* League tabs */}
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
        <table className="md-table">
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
        </table>
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
  return form.split("").reduce((acc, c) => acc + (c === "W" ? 3 : c === "D" ? 1 : 0), 0)
}

function FormLeadersSection() {
  const { matches, loading } = useMatchFeed()

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
            wins: chars.filter((c) => c === "W").length,
            draws: chars.filter((c) => c === "D").length,
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
        <table className="md-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Team</th>
              <th>League</th>
              <th title="Last 5 form">Form</th>
              <th title="Points from last 5">Pts</th>
              <th title="Wins">W</th>
              <th title="Draws">D</th>
              <th title="Losses">L</th>
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
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: c === "W" ? "var(--positive)" : c === "D" ? "var(--warning)" : "var(--negative)",
                          opacity: 0.85,
                          display: "inline-block",
                        }}
                        title={c === "W" ? "Win" : c === "D" ? "Draw" : "Loss"}
                      />
                    ))}
                  </span>
                </td>
                <td><strong>{formScore(t.form)}</strong></td>
                <td>{t.wins}</td>
                <td>{t.draws}</td>
                <td>{t.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const { matches } = useMatchFeed()
  const [injuries, setInjuries] = useState<InjuryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const loadInjuries = useCallback(async () => {
    const upcoming = matches.filter((m) => m.status === "UPCOMING").slice(0, 6)
    if (upcoming.length === 0) return
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        upcoming.map((m) =>
          fetch(`/api/injuries?fixture=${m.id}`)
            .then((r) => r.json())
            .then((d) => ({ match: m, injuries: d.injuries ?? [] })),
        ),
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

  useEffect(() => {
    if (matches.length > 0 && !fetched) {
      void loadInjuries()
    }
  }, [matches, fetched, loadInjuries])

  return (
    <Card>
      <CardTitle>Injury Watch</CardTitle>
      <CardSubtitle>Missing and doubtful players for upcoming fixtures</CardSubtitle>

      {loading && <Skeleton variant="list" count={4} />}
      {!loading && fetched && injuries.length === 0 && (
        <EmptyState title="No injuries reported" text="No injury reports for upcoming fixtures." />
      )}
      {!loading && injuries.length > 0 && (
        <table className="md-table">
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
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: inj.type === "Missing Fixture"
                        ? "rgba(255,68,68,0.12)"
                        : "rgba(245,158,11,0.12)",
                      color: inj.type === "Missing Fixture"
                        ? "var(--negative)"
                        : "var(--warning)",
                    }}
                  >
                    {inj.type}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{inj.reason || "—"}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{inj.matchLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        subtitle="Top scorers, form leaders, and injury watch across the top 5 leagues"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <TopScorersSection />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: 16 }}>
          <FormLeadersSection />
          <InjuryWatchSection />
        </div>
      </div>
    </div>
  )
}
