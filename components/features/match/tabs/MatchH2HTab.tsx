"use client"

import type { Match } from "@/types/match"

export function MatchH2HTab({ match }: { match: Match }) {
  if (!match.h2h || match.h2h.length === 0) {
    return <p className="md-text-muted">No head-to-head history.</p>
  }
  return (
    <table className="md-table">
      <thead>
        <tr><th>Date</th><th>Match</th><th>Score</th></tr>
      </thead>
      <tbody>
        {match.h2h.map((h, i) => (
          <tr key={i}>
            <td className="md-mono">
              {new Date(h.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </td>
            <td>{h.home} vs {h.away}</td>
            <td className="md-mono">{h.score.home}–{h.score.away}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
