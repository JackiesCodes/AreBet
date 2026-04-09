"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils/cn"
import type { Match } from "@/types/match"
import { statusLabel } from "@/lib/utils/match-status"
import { formatTime } from "@/lib/utils/time"
import { calculateValueEdge } from "@/lib/utils/value-bet"
import { ConfidenceHeat } from "@/components/primitives/ConfidenceHeat"
import { Badge } from "@/components/primitives/Badge"
import { ValueBadge } from "@/components/primitives/ValueBadge"
import { FavoritesSwitcher } from "./FavoritesSwitcher"

interface MatchCardProps {
  match: Match
  selected?: boolean
  onSelect?: (match: Match) => void
}

export function MatchCard({ match, selected, onSelect }: MatchCardProps) {
  const isLive = match.status === "LIVE"
  const isFinished = match.status === "FINISHED"

  const valueEdge = useMemo(() => calculateValueEdge(match), [match])

  return (
    <article
      className={cn(
        "cc-match-card",
        selected && "cc-match-card--selected",
        valueEdge?.isValue && "cc-match-card--value",
      )}
      onClick={() => onSelect?.(match)}
      role="button"
      tabIndex={0}
    >
      <div className="cc-match-meta">
        <Badge tone={isLive ? "live" : isFinished ? "finished" : "upcoming"}>
          {isLive ? "LIVE" : isFinished ? "FT" : statusLabel({ status: "UPCOMING" })}
        </Badge>
        <span className="cc-match-time">
          {isLive ? `${match.minute ?? 0}'` : isFinished ? "FT" : formatTime(match.kickoffISO)}
        </span>
        <span className="cc-match-league">{match.league}</span>
        {valueEdge?.isValue && <ValueBadge edge={valueEdge} showEdge={false} />}
      </div>
      <div className="cc-match-teams">
        <div className="cc-match-team">
          <span className="cc-match-team-name">{match.home.name}</span>
          {(isLive || isFinished) && <span className="cc-match-team-score">{match.score.home}</span>}
        </div>
        <div className="cc-match-team">
          <span className="cc-match-team-name">{match.away.name}</span>
          {(isLive || isFinished) && <span className="cc-match-team-score">{match.score.away}</span>}
        </div>
      </div>
      <div className="cc-match-right">
        <FavoritesSwitcher
          type="match"
          id={String(match.id)}
          label={`${match.home.short} vs ${match.away.short}`}
          meta={{ league: match.league }}
        />
        <ConfidenceHeat value={match.prediction.confidence} />
        <span className="cc-match-advice">{match.prediction.advice}</span>
      </div>
    </article>
  )
}
