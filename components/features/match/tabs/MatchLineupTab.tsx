"use client"

import type { Match } from "@/types/match"
import { LineupDisplay } from "@/components/features/match/LineupDisplay"

export function MatchLineupTab({ match }: { match: Match }) {
  if (!match.lineup) {
    return (
      <p className="md-text-muted">
        Lineups not yet announced — usually released 60 min before kickoff.
      </p>
    )
  }
  return (
    <LineupDisplay
      lineup={match.lineup}
      homeTeam={match.home.name}
      awayTeam={match.away.name}
    />
  )
}
