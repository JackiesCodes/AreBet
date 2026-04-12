"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils/cn"
import type { Match } from "@/types/match"
import { formatTime } from "@/lib/utils/time"
import { calculateValueEdge } from "@/lib/utils/value-bet"
import { confTier } from "@/lib/utils/match-status"
import { Badge } from "@/components/primitives/Badge"
import { FormGuide } from "@/components/primitives/FormGuide"
import { FavoritesSwitcher } from "./FavoritesSwitcher"
import type { MatchChange } from "@/types/alerts"
import { CHANGE_ICONS } from "@/lib/utils/match-changes"

interface MatchCardProps {
  match: Match
  selected?: boolean
  onSelect?: (match: Match) => void
  latestChange?: MatchChange
  compact?: boolean
}

// Map advice text to a short signal label shown on card
function shortAdvice(advice: string): string {
  const a = advice.toLowerCase()
  if (a.includes("home")) return "Home Win"
  if (a.includes("away")) return "Away Win"
  if (a.includes("draw")) return "Draw"
  if (a.includes("over")) return "Over 2.5"
  if (a.includes("btts") || a.includes("both")) return "BTTS"
  return advice.split(" ").slice(0, 2).join(" ")
}

export function MatchCard({ match, selected, onSelect, latestChange, compact }: MatchCardProps) {
  const isLive = match.status === "LIVE"
  const isFinished = match.status === "FINISHED"
  const conf = match.prediction.confidence
  const tier = confTier(conf)

  const valueEdge = useMemo(() => calculateValueEdge(match), [match])
  const isValue = valueEdge?.isValue === true
  const isHighConf = conf >= 72 && !isValue

  return (
    <article
      className={cn(
        "cc-match-card",
        compact && "cc-match-card--compact",
        selected && "cc-match-card--selected",
        isValue && "cc-match-card--value",
        isLive && "cc-match-card--live",
      )}
      onClick={() => onSelect?.(match)}
      role="button"
      tabIndex={0}
      aria-label={`${match.home.name} vs ${match.away.name}`}
    >
      {/* Row 1: status + league + signal pills */}
      <div className="cc-match-meta">
        <Badge tone={isLive ? "live" : isFinished ? "finished" : "upcoming"}>
          {isLive ? `${match.minute ?? 0}'` : isFinished ? "FT" : formatTime(match.kickoffISO)}
        </Badge>
        <span className="cc-match-league">{match.league}</span>
        <div className="cc-signal-pills">
          {isValue && (
            <span className="cc-signal-pill cc-signal-pill--value">
              ▲ VALUE +{(valueEdge!.edge * 100).toFixed(0)}%
            </span>
          )}
          {isHighConf && (
            <span className="cc-signal-pill cc-signal-pill--conf">
              ✦ {Math.round(conf)}%
            </span>
          )}
        </div>
        <FavoritesSwitcher
          type="match"
          id={String(match.id)}
          label={`${match.home.short} vs ${match.away.short}`}
          meta={{ league: match.league }}
        />
      </div>

      {/* Row 2: teams + scores + form guides */}
      <div className="cc-match-body">
        <div className="cc-match-team-row">
          <span className="cc-match-team-name">{match.home.name}</span>
          {(isLive || isFinished) && (
            <span className={cn("cc-match-team-score", isLive && "cc-match-team-score--live")}>
              {match.score.home}
            </span>
          )}
        </div>
        <div className="cc-match-team-row">
          <span className="cc-match-team-name">{match.away.name}</span>
          {(isLive || isFinished) && (
            <span className={cn("cc-match-team-score", isLive && "cc-match-team-score--live")}>
              {match.score.away}
            </span>
          )}
        </div>
      </div>

      {/* Row 3: form guides + prediction advice */}
      <div className="cc-match-footer">
        <div className="cc-match-forms">
          <FormGuide form={match.home.form} />
          <span className="cc-match-forms-sep">vs</span>
          <FormGuide form={match.away.form} />
        </div>
        <div className={cn("cc-conf-tag", `cc-conf-tag--${tier}`)}>
          {shortAdvice(match.prediction.advice)}
        </div>
      </div>

      {/* Row 4: change alert strip — only when there's a new unread change */}
      {latestChange && (
        <div className={cn("cc-change-strip", `cc-change-strip--${latestChange.severity}`)}>
          <span className="cc-change-strip-icon" aria-hidden>
            {CHANGE_ICONS[latestChange.type]}
          </span>
          <span className="cc-change-strip-summary">{latestChange.summary}</span>
          {latestChange.detail && (
            <span className="cc-change-strip-detail">{latestChange.detail}</span>
          )}
        </div>
      )}
    </article>
  )
}
