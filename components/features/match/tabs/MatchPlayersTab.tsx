"use client"

import type { Match } from "@/types/match"
import { PlayerStatsPanel } from "@/components/features/match/PlayerStatsPanel"

export function MatchPlayersTab({ match }: { match: Match }) {
  if (!match.playerRatings) {
    return <p className="md-text-muted">Player ratings not available for this match.</p>
  }
  return (
    <PlayerStatsPanel
      playerRatings={match.playerRatings}
      homeTeam={match.home.name}
      awayTeam={match.away.name}
    />
  )
}
