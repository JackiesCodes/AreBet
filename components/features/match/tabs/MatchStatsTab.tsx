"use client"

import type { Match } from "@/types/match"
import { MatchStatBar } from "@/components/primitives/MatchStatBar"
import { MomentumGraph } from "@/components/features/match/MomentumGraph"

export function MatchStatsTab({ match }: { match: Match }) {
  if (match.stats) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <MatchStatBar label="Possession" home={match.stats.possession.h} away={match.stats.possession.a} unit="%" />
        <MatchStatBar label="Shots" home={match.stats.shots.h} away={match.stats.shots.a} />
        <MatchStatBar label="On Target" home={match.stats.shotsOnTarget.h} away={match.stats.shotsOnTarget.a} />
        {match.stats.shotsInsideBox && <MatchStatBar label="Inside Box" home={match.stats.shotsInsideBox.h} away={match.stats.shotsInsideBox.a} />}
        {match.stats.shotsOutsideBox && <MatchStatBar label="Outside Box" home={match.stats.shotsOutsideBox.h} away={match.stats.shotsOutsideBox.a} />}
        {match.stats.shotsBlocked && <MatchStatBar label="Blocked" home={match.stats.shotsBlocked.h} away={match.stats.shotsBlocked.a} />}
        <MatchStatBar label="xG" home={match.stats.xg.h} away={match.stats.xg.a} />
        <MatchStatBar label="Pass Acc." home={match.stats.passAccuracy.h} away={match.stats.passAccuracy.a} unit="%" />
        <MatchStatBar label="Corners" home={match.stats.corners.h} away={match.stats.corners.a} />
        {match.stats.fouls && <MatchStatBar label="Fouls" home={match.stats.fouls.h} away={match.stats.fouls.a} />}
        {match.stats.offsides && <MatchStatBar label="Offsides" home={match.stats.offsides.h} away={match.stats.offsides.a} />}
        {match.stats.yellowCards && <MatchStatBar label="Yellow Cards" home={match.stats.yellowCards.h} away={match.stats.yellowCards.a} />}
        {match.stats.redCards && <MatchStatBar label="Red Cards" home={match.stats.redCards.h} away={match.stats.redCards.a} />}
        {match.events.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <MomentumGraph events={match.events} homeTeam={match.home.short} awayTeam={match.away.short} />
          </div>
        )}
      </div>
    )
  }

  // Upcoming match — show model forecast
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className="md-text-muted" style={{ fontSize: 13 }}>
        Live statistics are available once the match kicks off. Pre-match model forecast below.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <MatchStatBar
          label="xG forecast"
          home={match.prediction.expectedGoals.home}
          away={match.prediction.expectedGoals.away}
        />
        {match.prediction.modelProbs && (
          <>
            <MatchStatBar
              label="Win probability"
              home={Math.round(match.prediction.modelProbs.home * 100)}
              away={Math.round(match.prediction.modelProbs.away * 100)}
              unit="%"
            />
            <MatchStatBar
              label="Draw probability"
              home={Math.round(match.prediction.modelProbs.draw * 100)}
              away={Math.round(match.prediction.modelProbs.draw * 100)}
              unit="%"
            />
          </>
        )}
      </div>
    </div>
  )
}
