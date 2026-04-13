"use client"

import { useMemo } from "react"
import Link from "next/link"
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

// Deterministic color from team name — cycles through 8 distinct hues
const TEAM_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

function teamColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return TEAM_COLORS[hash % TEAM_COLORS.length]
}

function TeamCircle({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const color = teamColor(name)
  return (
    <span className="cc-team-circle" style={{ "--tc": color } as React.CSSProperties}>
      {initials}
    </span>
  )
}

interface MatchCardProps {
  match: Match
  selected?: boolean
  onSelect?: (match: Match) => void
  latestChange?: MatchChange
  compact?: boolean
}

function shortAdvice(advice: string): string {
  const a = advice.toLowerCase()
  if (a.includes("home")) return "Home Win"
  if (a.includes("away")) return "Away Win"
  if (a.includes("draw")) return "Draw"
  if (a.includes("over")) return "Over 2.5"
  if (a.includes("btts") || a.includes("both")) return "BTTS"
  return advice.split(" ").slice(0, 2).join(" ")
}

function pct(val: number | undefined) {
  if (val == null) return null
  return `${Math.round(val * 100)}%`
}

export function MatchCard({ match, selected, onSelect, latestChange, compact }: MatchCardProps) {
  const isLive = match.status === "LIVE"
  const isFinished = match.status === "FINISHED"
  const isUpcoming = match.status === "UPCOMING"
  const conf = match.prediction.confidence
  const tier = confTier(conf)
  const hasForm = Boolean(match.home.form || match.away.form)
  const hasPrediction = match.prediction.advice && match.prediction.advice !== "No prediction available"
  const showFooter = !compact || hasForm || hasPrediction

  const valueEdge = useMemo(() => calculateValueEdge(match), [match])
  const isValue = valueEdge?.isValue === true
  const isHighConf = conf >= 72 && !isValue

  // Win-probability row for upcoming matches
  const probs = match.prediction.modelProbs
  const homeScore = isLive || isFinished ? match.score.home : null
  const awayScore = isLive || isFinished ? match.score.away : null

  // Determine winner for score coloring
  const homeWon = isFinished && homeScore != null && awayScore != null && homeScore > awayScore
  const awayWon = isFinished && homeScore != null && awayScore != null && awayScore > homeScore

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
      {/* Full-card link overlay — always active for navigation */}
      <Link href={`/match/${match.id}`} className="cc-match-card-link" aria-hidden tabIndex={-1} />

      {/* Row 1: status badge · league · signal pills · favorite */}
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

      {/* Row 2: teams + scores */}
      <div className="cc-match-body">
        <div className="cc-match-team-row">
          <TeamCircle name={match.home.name} />
          <span className="cc-match-team-name">{match.home.name}</span>
          {homeScore != null && (
            <span className={cn(
              "cc-match-team-score",
              isLive && "cc-match-team-score--live",
              homeWon && "cc-match-team-score--winner",
            )}>
              {homeScore}
            </span>
          )}
        </div>
        <div className="cc-match-team-divider" aria-hidden />
        <div className="cc-match-team-row">
          <TeamCircle name={match.away.name} />
          <span className="cc-match-team-name">{match.away.name}</span>
          {awayScore != null && (
            <span className={cn(
              "cc-match-team-score",
              isLive && "cc-match-team-score--live",
              awayWon && "cc-match-team-score--winner",
            )}>
              {awayScore}
            </span>
          )}
        </div>
      </div>

      {/* Win probability bar for upcoming matches */}
      {isUpcoming && probs && !compact && (
        <div className="cc-prob-row">
          <span className="cc-prob-label">{pct(probs.home)}</span>
          <div className="cc-prob-bar">
            <div className="cc-prob-bar-home" style={{ width: `${probs.home * 100}%` }} />
            <div className="cc-prob-bar-draw" style={{ width: `${probs.draw * 100}%` }} />
            <div className="cc-prob-bar-away" style={{ width: `${probs.away * 100}%` }} />
          </div>
          <span className="cc-prob-label cc-prob-label--right">{pct(probs.away)}</span>
        </div>
      )}

      {/* Row 3: form guides + prediction advice */}
      {showFooter && (
        <div className="cc-match-footer">
          {hasForm && (
            <div className="cc-match-forms">
              <FormGuide form={match.home.form} />
              <span className="cc-match-forms-sep">vs</span>
              <FormGuide form={match.away.form} />
            </div>
          )}
          {hasPrediction && (
            <div className={cn("cc-conf-tag", `cc-conf-tag--${tier}`)}>
              {shortAdvice(match.prediction.advice)}
            </div>
          )}
        </div>
      )}

      {/* Change alert strip */}
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
