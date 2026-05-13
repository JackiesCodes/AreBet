"use client"

import Image from "next/image"
import type { Match } from "@/types/match"

export function MatchOverviewTab({ match }: { match: Match }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 className="md-card-title">{match.prediction.advice}</h3>
        <p className="md-card-subtitle">
          Model confidence {Math.round(match.prediction.confidence)}%. Expected goals{" "}
          {match.prediction.expectedGoals.home} – {match.prediction.expectedGoals.away}.
        </p>
        <p className="md-text-secondary" style={{ fontSize: 13 }}>
          {match.venue}, {match.country}
        </p>
      </div>

      {/* Coaches */}
      {match.coaches && (match.coaches.home || match.coaches.away) && (
        <div>
          <h4 className="insight-section-title">Managers</h4>
          <div className="coach-cards">
            {[
              { side: "home", coach: match.coaches.home, team: match.home.name },
              { side: "away", coach: match.coaches.away, team: match.away.name },
            ].map(({ side, coach, team }) => (
              <div key={side} className="coach-card">
                <div className="coach-card-header">
                  {coach?.photo
                    ? <Image src={coach.photo} alt={coach.name ?? "Coach"} width={44} height={44} className="coach-photo" />
                    : <div className="coach-photo-placeholder">👤</div>
                  }
                  <div>
                    <div className="coach-info-team">{team}</div>
                    <div className="coach-info-name">{coach?.name ?? "Unknown"}</div>
                    <div className="coach-info-meta">
                      {[coach?.nationality, coach?.age ? `Age ${coach.age}` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                {coach?.career && coach.career.length > 0 && (
                  <div className="coach-career">
                    <div className="coach-career-title">Career</div>
                    {coach.career.slice(0, 4).map((c, i) => (
                      <div key={i} className="coach-career-row">
                        <span className="coach-career-club">{c.teamName}</span>
                        <span className="coach-career-dates">{c.start.slice(0, 4)}{c.end ? `–${c.end.slice(0, 4)}` : "–now"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Injuries */}
      {match.injuries && match.injuries.length > 0 && (
        <div>
          <h4 className="insight-section-title">Injuries</h4>
          <table className="md-table">
            <thead><tr><th>Player</th><th>Team</th><th>Type</th><th>Reason</th></tr></thead>
            <tbody>
              {match.injuries.map((inj, i) => (
                <tr key={i}>
                  <td>{inj.playerName}</td>
                  <td>{inj.team === "home" ? match.home.name : match.away.name}</td>
                  <td>{inj.type}</td>
                  <td className="md-text-muted">{inj.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
