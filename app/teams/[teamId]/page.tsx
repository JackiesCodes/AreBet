import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  fetchTeam,
  fetchFixturesByTeam,
  fetchRecentFixturesByTeam,
  fetchPlayerStatsByTeam,
  currentSeason,
} from "@/lib/api-football/client"
import { mapFixtureToMatch } from "@/lib/api-football/mapper"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import { FormGuide } from "@/components/primitives/FormGuide"
import type { Match } from "@/types/match"

interface PageProps {
  params: Promise<{ teamId: string }>
}

export default async function TeamPage({ params }: PageProps) {
  const { teamId } = await params
  const id = Number.parseInt(teamId, 10)
  if (Number.isNaN(id)) notFound()

  const season = currentSeason()

  const [teamData, upcomingFixtures, recentFixtures, players] = await Promise.allSettled([
    fetchTeam(id),
    fetchFixturesByTeam(id, 8),
    fetchRecentFixturesByTeam(id, 5),
    fetchPlayerStatsByTeam(id, season),
  ])

  const team = teamData.status === "fulfilled" ? teamData.value : null
  if (!team) notFound()

  const upcoming: Match[] = upcomingFixtures.status === "fulfilled"
    ? upcomingFixtures.value.map(mapFixtureToMatch).filter((m) => m.status === "UPCOMING")
    : []

  const recent: Match[] = recentFixtures.status === "fulfilled"
    ? recentFixtures.value.map(mapFixtureToMatch).filter((m) => m.status === "FINISHED")
    : []

  const squad = players.status === "fulfilled"
    ? players.value.slice(0, 20)
    : []

  const { team: t, venue } = team

  return (
    <div className="team-page">
      <div className="team-page-back">
        <Link href="/teams">← Teams</Link>
      </div>

      {/* Hero */}
      <div className="team-hero">
        <div className="team-hero-logo">
          {t.logo ? (
            <Image src={t.logo} alt={t.name} width={72} height={72} unoptimized />
          ) : (
            <span className="team-hero-initial">{t.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="team-hero-info">
          <h1 className="team-hero-name">{t.name}</h1>
          <div className="team-hero-meta">
            {t.country && <span>{t.country}</span>}
            {t.founded && <span>Est. {t.founded}</span>}
            {venue?.name && <span>{venue.name}</span>}
          </div>
        </div>
      </div>

      {/* Upcoming fixtures */}
      {upcoming.length > 0 && (
        <section className="team-section">
          <h2 className="team-section-title">Upcoming</h2>
          <div className="team-fixture-list">
            {upcoming.map((m) => (
              <FixtureRow key={m.id} match={m} teamId={id} />
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      {recent.length > 0 && (
        <section className="team-section">
          <h2 className="team-section-title">Recent Results</h2>
          <div className="team-fixture-list">
            {recent.map((m) => (
              <FixtureRow key={m.id} match={m} teamId={id} showResult />
            ))}
          </div>
        </section>
      )}

      {/* Squad */}
      {squad.length > 0 && (
        <section className="team-section">
          <h2 className="team-section-title">Squad</h2>
          <div className="team-squad-grid">
            {squad.map((p) => {
              const stat = p.statistics?.[0]
              const goals = stat?.goals?.total ?? 0
              const apps = stat?.games?.appearences ?? 0
              return (
                <Link
                  key={p.player.id}
                  href={`/players/${p.player.id}`}
                  className="team-player-card"
                >
                  <div className="team-player-photo">
                    {p.player.photo ? (
                      <Image
                        src={p.player.photo}
                        alt={p.player.name}
                        width={48}
                        height={48}
                        unoptimized
                        className="team-player-photo-img"
                      />
                    ) : (
                      <span className="team-player-initial">
                        {p.player.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="team-player-info">
                    <span className="team-player-name">{p.player.name}</span>
                    {(apps > 0 || goals > 0) && (
                      <span className="team-player-stats">
                        {apps > 0 && `${apps} apps`}
                        {apps > 0 && goals > 0 && " · "}
                        {goals > 0 && `${goals} goals`}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {upcoming.length === 0 && recent.length === 0 && squad.length === 0 && (
        <div className="team-empty">No data available for this team this season.</div>
      )}
    </div>
  )
}

function FixtureRow({ match: m, teamId, showResult }: { match: Match; teamId: number; showResult?: boolean }) {
  const isHome = m.home.id === teamId
  const opp = isHome ? m.away : m.home
  const teamScore = isHome ? m.score.home : m.score.away
  const oppScore = isHome ? m.score.away : m.score.home
  const result = showResult
    ? teamScore > oppScore ? "W" : teamScore === oppScore ? "D" : "L"
    : null

  return (
    <Link href={`/match/${m.id}`} className="team-fixture-row">
      <span className="team-fixture-label">{isHome ? "H" : "A"}</span>
      <span className="team-fixture-opp">
        {opp.logo && (
          <Image src={opp.logo} alt={opp.name} width={16} height={16} unoptimized style={{ borderRadius: 2 }} />
        )}
        {opp.name}
      </span>
      <span className="team-fixture-league">{m.league}</span>
      <span className="team-fixture-right">
        {showResult ? (
          <>
            <span className="team-fixture-score">{teamScore}–{oppScore}</span>
            <span className={`team-fixture-result team-fixture-result--${result?.toLowerCase()}`}>{result}</span>
          </>
        ) : (
          <span className="team-fixture-time">{formatShortDate(m.kickoffISO)} · {formatTime(m.kickoffISO)}</span>
        )}
      </span>
    </Link>
  )
}
