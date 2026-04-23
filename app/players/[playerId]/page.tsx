import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { fetchPlayerById, currentSeason } from "@/lib/api-football/client"

interface PageProps {
  params: Promise<{ playerId: string }>
}

export default async function PlayerPage({ params }: PageProps) {
  const { playerId } = await params
  const id = Number.parseInt(playerId, 10)
  if (Number.isNaN(id)) notFound()

  const season = currentSeason()
  const data = await fetchPlayerById(id, season).catch(() => null)
  if (!data) notFound()

  const { player, statistics } = data
  const stat = statistics?.[0]
  const team = stat?.team
  const league = stat?.league

  const goals = stat?.goals?.total ?? 0
  const assists = stat?.goals?.assists ?? 0
  const apps = stat?.games?.appearences ?? 0
  const lineups = stat?.games?.lineups ?? 0
  const minutes = stat?.games?.minutes ?? 0
  const rating = stat?.games?.rating ? parseFloat(stat.games.rating).toFixed(1) : null
  const shots = stat?.shots?.total ?? 0
  const shotsOn = stat?.shots?.on ?? 0
  const keyPasses = stat?.passes?.key ?? 0

  return (
    <div className="player-page">
      <div className="player-page-back">
        <Link href="/">← Back</Link>
      </div>

      {/* Hero */}
      <div className="player-hero">
        <div className="player-hero-photo">
          {player.photo ? (
            <Image
              src={player.photo}
              alt={player.name}
              width={80}
              height={80}
              unoptimized
              className="player-hero-photo-img"
            />
          ) : (
            <span className="player-hero-initial">{player.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="player-hero-info">
          <h1 className="player-hero-name">{player.name}</h1>
          <div className="player-hero-meta">
            {player.nationality && <span>{player.nationality}</span>}
            {player.age && <span>Age {player.age}</span>}
            {team && (
              <Link href={`/teams/${team.id}`} className="player-hero-club">
                {team.logo && (
                  <Image src={team.logo} alt={team.name} width={16} height={16} unoptimized />
                )}
                {team.name}
              </Link>
            )}
          </div>
          {league && (
            <div className="player-hero-league">
              {league.logo && (
                <Image src={league.logo} alt={league.name} width={14} height={14} unoptimized />
              )}
              <span>{league.name} · {league.country} · {season}/{season + 1}</span>
            </div>
          )}
        </div>
      </div>

      {/* Season stats */}
      {apps > 0 && (
        <section className="player-section">
          <h2 className="player-section-title">Season Stats</h2>
          <div className="player-stat-grid">
            {[
              { label: "Apps", value: apps },
              { label: "Lineups", value: lineups },
              { label: "Minutes", value: minutes ? `${minutes}'` : "–" },
              { label: "Goals", value: goals },
              { label: "Assists", value: assists },
              { label: "Key Passes", value: keyPasses },
              { label: "Shots", value: shots },
              { label: "On Target", value: shotsOn },
              ...(rating ? [{ label: "Rating", value: rating, highlight: true }] : []),
            ].map(({ label, value, highlight }) => (
              <div key={label} className="player-stat-cell">
                <div className={`player-stat-value${highlight ? " player-stat-value--highlight" : ""}`}>
                  {value}
                </div>
                <div className="player-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {apps === 0 && (
        <div className="player-empty">No statistics available for this player this season.</div>
      )}
    </div>
  )
}
