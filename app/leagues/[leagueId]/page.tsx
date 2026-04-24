import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  fetchLeagueById,
  fetchFixturesByLeague,
  fetchStandings,
  currentSeason,
} from "@/lib/api-football/client"
import { mapFixtureToMatch } from "@/lib/api-football/mapper"
import { formatTime, formatShortDate } from "@/lib/utils/time"

interface PageProps {
  params: Promise<{ leagueId: string }>
}

export default async function LeaguePage({ params }: PageProps) {
  const { leagueId } = await params
  const id = Number.parseInt(leagueId, 10)
  if (Number.isNaN(id)) notFound()

  const season = currentSeason()

  const [leagueData, fixtureData, standingsData] = await Promise.allSettled([
    fetchLeagueById(id),
    fetchFixturesByLeague(id, season, 10),
    fetchStandings(id, season),
  ])

  const league = leagueData.status === "fulfilled" ? leagueData.value : null
  if (!league) notFound()

  const fixtures = fixtureData.status === "fulfilled"
    ? fixtureData.value.map(mapFixtureToMatch).filter((m) => m.status === "UPCOMING")
    : []

  const standings = standingsData.status === "fulfilled" ? standingsData.value : null
  const standingRows = standings?.league?.standings?.[0] ?? []

  const { league: l, country } = league

  return (
    <div className="team-page">
      <div className="team-page-back">
        <Link href="/standings">← Standings</Link>
      </div>

      {/* Hero */}
      <div className="team-hero">
        <div className="team-hero-logo">
          {l.logo ? (
            <Image src={l.logo} alt={l.name} width={72} height={72} unoptimized />
          ) : (
            <span className="team-hero-initial">{l.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="team-hero-info">
          <h1 className="team-hero-name">{l.name}</h1>
          <div className="team-hero-meta">
            {country.flag && (
              <Image src={country.flag} alt={country.name} width={18} height={12} unoptimized style={{ borderRadius: 2 }} />
            )}
            <span>{country.name}</span>
            <span>{season}/{season + 1}</span>
          </div>
        </div>
      </div>

      {/* Upcoming fixtures */}
      {fixtures.length > 0 && (
        <section className="team-section">
          <h2 className="team-section-title">Upcoming Fixtures</h2>
          <div className="team-fixture-list">
            {fixtures.map((m) => (
              <Link key={m.id} href={`/match/${m.id}`} className="team-fixture-row">
                <span className="team-fixture-opp">
                  {m.home.logo && (
                    <Image src={m.home.logo} alt={m.home.name} width={16} height={16} unoptimized style={{ borderRadius: 2 }} />
                  )}
                  {m.home.name}
                </span>
                <span className="team-fixture-league" style={{ color: "var(--text-muted)", fontSize: 11 }}>vs</span>
                <span className="team-fixture-opp">
                  {m.away.logo && (
                    <Image src={m.away.logo} alt={m.away.name} width={16} height={16} unoptimized style={{ borderRadius: 2 }} />
                  )}
                  {m.away.name}
                </span>
                <span className="team-fixture-time" style={{ marginLeft: "auto" }}>
                  {formatShortDate(m.kickoffISO)} · {formatTime(m.kickoffISO)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Standings */}
      {standingRows.length > 0 && (
        <section className="team-section">
          <h2 className="team-section-title">Standings</h2>
          <div className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standingRows.map((row) => (
                  <tr key={row.team.id}>
                    <td style={{ color: "var(--text-muted)" }}>{row.rank}</td>
                    <td style={{ fontWeight: 500 }}>
                      <Link href={`/teams/${row.team.id}`}>{row.team.name}</Link>
                    </td>
                    <td>{row.all.played}</td>
                    <td>{row.all.win}</td>
                    <td>{row.all.draw}</td>
                    <td>{row.all.lose}</td>
                    <td style={{ color: row.goalsDiff > 0 ? "var(--positive)" : row.goalsDiff < 0 ? "var(--negative)" : "inherit" }}>
                      {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                    </td>
                    <td><strong>{row.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {fixtures.length === 0 && standingRows.length === 0 && (
        <div className="team-empty">No data available for this league this season.</div>
      )}
    </div>
  )
}
