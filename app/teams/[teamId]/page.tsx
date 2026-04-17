"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { FormGuide } from "@/components/primitives/FormGuide"
import { FavoritesSwitcher } from "@/components/features/FavoritesSwitcher"
import { formatTime } from "@/lib/utils/time"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"

export default function TeamDetailPage() {
  const params = useParams()
  const teamName = decodeURIComponent(params.teamId as string)
  const { matches, loading } = useMatchIntelligence()

  const teamMatches = useMemo(
    () => matches.filter((m) => m.home.name === teamName || m.away.name === teamName),
    [matches, teamName],
  )

  const teamInfo = useMemo(() => {
    const m = teamMatches[0]
    if (!m) return null
    const isHome = m.home.name === teamName
    return {
      name: teamName,
      league: m.league,
      form: isHome ? m.home.form : m.away.form,
    }
  }, [teamMatches, teamName])

  // Aggregate stats from all matches this team has been in
  const stats = useMemo(() => {
    let goalsFor = 0, goalsAgainst = 0, wins = 0, draws = 0, losses = 0, played = 0
    for (const m of teamMatches) {
      if (m.status !== "FINISHED") continue
      const isHome = m.home.name === teamName
      const gf = isHome ? m.score.home : m.score.away
      const ga = isHome ? m.score.away : m.score.home
      goalsFor += gf
      goalsAgainst += ga
      played++
      if (gf > ga) wins++
      else if (gf === ga) draws++
      else losses++
    }
    return { goalsFor, goalsAgainst, wins, draws, losses, played, gd: goalsFor - goalsAgainst }
  }, [teamMatches, teamName])

  const upcoming = teamMatches.filter((m) => m.status === "UPCOMING").slice(0, 5)
  const live = teamMatches.filter((m) => m.status === "LIVE")
  const finished = teamMatches.filter((m) => m.status === "FINISHED").slice(0, 5)

  if (loading) return <div className="md-page"><Skeleton count={6} /></div>

  if (!teamInfo) {
    return (
      <div className="md-page">
        <PageHeader title={teamName} subtitle="Team not found in current feed" />
        <EmptyState title="No data available" text="This team has no matches in the current feed." />
        <div style={{ marginTop: 16 }}>
          <Link href="/teams" className="md-btn md-btn--ghost md-btn--sm">← Back to Teams</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="md-page">
      <div style={{ marginBottom: 8 }}>
        <Link href="/teams" className="md-text-muted" style={{ fontSize: 12 }}>← Teams</Link>
      </div>

      <div className="team-detail-header">
        <div className="team-detail-avatar">
          {teamName.slice(0, 2).toUpperCase()}
        </div>
        <div className="team-detail-meta">
          <h1 className="team-detail-name">{teamName}</h1>
          <div className="md-text-muted" style={{ fontSize: 13 }}>{teamInfo.league}</div>
          {teamInfo.form && (
            <div style={{ marginTop: 6 }}>
              <FormGuide form={teamInfo.form} />
            </div>
          )}
        </div>
        <FavoritesSwitcher type="team" id={teamName} label={teamName} meta={{ league: teamInfo.league }} />
      </div>

      {/* Stats summary */}
      {stats.played > 0 && (
        <div className="team-stat-grid">
          {[
            { label: "Played", value: stats.played },
            { label: "Won", value: stats.wins, color: "var(--positive)" },
            { label: "Drawn", value: stats.draws, color: "var(--text-muted)" },
            { label: "Lost", value: stats.losses, color: "var(--negative)" },
            { label: "Goals For", value: stats.goalsFor },
            { label: "Goals Against", value: stats.goalsAgainst },
            { label: "Goal Diff", value: stats.gd > 0 ? `+${stats.gd}` : stats.gd, color: stats.gd > 0 ? "var(--positive)" : stats.gd < 0 ? "var(--negative)" : undefined },
          ].map(({ label, value, color }) => (
            <div key={label} className="team-stat-cell">
              <div className="team-stat-value" style={color ? { color } : undefined}>{value}</div>
              <div className="team-stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Live */}
      {live.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 className="team-section-title">Live Now</h2>
          <MatchList matches={live} teamName={teamName} />
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 className="team-section-title">Upcoming</h2>
          <MatchList matches={upcoming} teamName={teamName} />
        </section>
      )}

      {/* Recent results */}
      {finished.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 className="team-section-title">Recent Results</h2>
          <MatchList matches={finished} teamName={teamName} />
        </section>
      )}

      {teamMatches.length === 0 && (
        <EmptyState title="No matches found" text="No matches for this team in the current feed." />
      )}
    </div>
  )
}

function MatchList({ matches, teamName }: { matches: Match[]; teamName: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {matches.map((m) => {
        const isHome = m.home.name === teamName
        const teamScore = isHome ? m.score.home : m.score.away
        const oppScore = isHome ? m.score.away : m.score.home
        const opp = isHome ? m.away.name : m.home.name
        const result = m.status === "FINISHED"
          ? teamScore > oppScore ? "W" : teamScore === oppScore ? "D" : "L"
          : null

        return (
          <Link key={m.id} href={`/match/${m.id}`} className="team-match-row">
            <div className="team-match-vs">
              <span className="md-text-muted" style={{ fontSize: 11 }}>{isHome ? "HOME" : "AWAY"}</span>
              <strong>{opp}</strong>
              <span className="md-text-muted" style={{ fontSize: 11 }}>{m.league}</span>
            </div>
            <div className="team-match-right">
              {m.status === "FINISHED" ? (
                <>
                  <span className="team-match-score">{teamScore}–{oppScore}</span>
                  <span className={cn("team-match-result", result === "W" ? "team-match-result--w" : result === "D" ? "team-match-result--d" : "team-match-result--l")}>
                    {result}
                  </span>
                </>
              ) : m.status === "LIVE" ? (
                <span className="live-dot" style={{ fontSize: 12 }}>● {m.minute ?? 0}'</span>
              ) : (
                <span className="md-text-muted" style={{ fontSize: 12 }}>{formatTime(m.kickoffISO)}</span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
