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
  const saves = stat?.goals?.saves ?? null
  const conceded = stat?.goals?.conceded ?? null
  const apps = stat?.games?.appearences ?? 0
  const lineups = stat?.games?.lineups ?? 0
  const minutes = stat?.games?.minutes ?? 0
  const rating = stat?.games?.rating ? parseFloat(stat.games.rating).toFixed(1) : null
  const position = stat?.games?.position ?? null

  const shots = stat?.shots?.total ?? 0
  const shotsOn = stat?.shots?.on ?? 0

  const passesTot = stat?.passes?.total ?? 0
  const keyPasses = stat?.passes?.key ?? 0
  const passAcc = stat?.passes?.accuracy ? `${stat.passes.accuracy}%` : null

  const tackles = stat?.tackles?.total ?? null
  const blocks = stat?.tackles?.blocks ?? null
  const interceptions = stat?.tackles?.interceptions ?? null

  const duelsTotal = stat?.duels?.total ?? null
  const duelsWon = stat?.duels?.won ?? null

  const dribblesAtt = stat?.dribbles?.attempts ?? null
  const dribblesSuc = stat?.dribbles?.success ?? null

  const foulsDrawn = stat?.fouls?.drawn ?? null
  const foulsCommitted = stat?.fouls?.committed ?? null

  const yellowCards = stat?.cards?.yellow ?? 0
  const redCards = stat?.cards?.red ?? 0

  const penScored = stat?.penalty?.scored ?? null
  const penMissed = stat?.penalty?.missed ?? null

  const offsides = stat?.offsides ?? null

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
            {position && <span className="player-hero-pos">{position}</span>}
            {player.height && <span>{player.height}</span>}
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

      {apps > 0 && (
        <>
          {/* Core stats */}
          <section className="player-section">
            <h2 className="player-section-title">Season Stats</h2>
            <div className="player-stat-grid">
              {[
                { label: "Apps", value: apps },
                { label: "Lineups", value: lineups },
                { label: "Minutes", value: minutes ? `${minutes}'` : "–" },
                { label: "Goals", value: goals, highlight: goals > 0 },
                { label: "Assists", value: assists, highlight: assists > 0 },
                { label: "Key Passes", value: keyPasses },
                { label: "Shots", value: shots },
                { label: "On Target", value: shotsOn },
                ...(rating ? [{ label: "Rating", value: rating, highlight: true }] : []),
                ...(saves !== null ? [{ label: "Saves", value: saves }] : []),
                ...(conceded !== null ? [{ label: "Goals Conceded", value: conceded }] : []),
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

          {/* Passing */}
          {(passesTot > 0 || passAcc) && (
            <section className="player-section">
              <h2 className="player-section-title">Passing</h2>
              <div className="player-stat-grid">
                {passesTot > 0 && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{passesTot}</div>
                    <div className="player-stat-label">Total</div>
                  </div>
                )}
                {passAcc && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{passAcc}</div>
                    <div className="player-stat-label">Accuracy</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Defensive */}
          {(tackles !== null || blocks !== null || interceptions !== null || duelsTotal !== null) && (
            <section className="player-section">
              <h2 className="player-section-title">Defensive</h2>
              <div className="player-stat-grid">
                {tackles !== null && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{tackles}</div>
                    <div className="player-stat-label">Tackles</div>
                  </div>
                )}
                {interceptions !== null && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{interceptions}</div>
                    <div className="player-stat-label">Interceptions</div>
                  </div>
                )}
                {blocks !== null && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{blocks}</div>
                    <div className="player-stat-label">Blocks</div>
                  </div>
                )}
                {duelsTotal !== null && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">
                      {duelsWon !== null ? `${duelsWon}/${duelsTotal}` : duelsTotal}
                    </div>
                    <div className="player-stat-label">Duels W/T</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Attacking / dribbles */}
          {(dribblesAtt !== null || offsides !== null) && (
            <section className="player-section">
              <h2 className="player-section-title">Attacking</h2>
              <div className="player-stat-grid">
                {dribblesAtt !== null && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">
                      {dribblesSuc !== null ? `${dribblesSuc}/${dribblesAtt}` : dribblesAtt}
                    </div>
                    <div className="player-stat-label">Dribbles S/A</div>
                  </div>
                )}
                {offsides !== null && offsides > 0 && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{offsides}</div>
                    <div className="player-stat-label">Offsides</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Discipline */}
          {(yellowCards > 0 || redCards > 0 || foulsCommitted !== null || penScored !== null) && (
            <section className="player-section">
              <h2 className="player-section-title">Discipline</h2>
              <div className="player-stat-grid">
                {foulsCommitted !== null && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{foulsCommitted}</div>
                    <div className="player-stat-label">Fouls</div>
                  </div>
                )}
                {foulsDrawn !== null && foulsDrawn > 0 && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">{foulsDrawn}</div>
                    <div className="player-stat-label">Drawn</div>
                  </div>
                )}
                {yellowCards > 0 && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value player-stat-value--yellow">{yellowCards}</div>
                    <div className="player-stat-label">Yellow</div>
                  </div>
                )}
                {redCards > 0 && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value player-stat-value--red">{redCards}</div>
                    <div className="player-stat-label">Red</div>
                  </div>
                )}
                {penScored !== null && (
                  <div className="player-stat-cell">
                    <div className="player-stat-value">
                      {penMissed !== null ? `${penScored}/${penScored + penMissed}` : penScored}
                    </div>
                    <div className="player-stat-label">Penalties S/T</div>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {apps === 0 && (
        <div className="player-empty">No statistics available for this player this season.</div>
      )}
    </div>
  )
}
