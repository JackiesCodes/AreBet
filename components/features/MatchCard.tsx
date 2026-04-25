"use client"

import { useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils/cn"
import type { Match } from "@/types/match"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import { calculateValueEdge } from "@/lib/utils/value-bet"
import { confTier } from "@/lib/utils/match-status"
import { FormGuide } from "@/components/primitives/FormGuide"
import { FavoritesSwitcher } from "./FavoritesSwitcher"
import type { MatchChange } from "@/types/alerts"
import { CHANGE_ICONS } from "@/lib/utils/match-changes"

// ── Team circle ────────────────────────────────────────────────────────────────

const TEAM_COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
]

function teamColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return TEAM_COLORS[hash % TEAM_COLORS.length]
}

function TeamCircle({ name, logo, size = "md" }: { name: string; logo?: string; size?: "sm" | "md" }) {
  if (logo) {
    const px = size === "sm" ? 20 : 28
    return (
      <Image
        src={logo}
        alt={name}
        width={px}
        height={px}
        className={cn("team-logo", size === "sm" && "team-logo--sm")}
        unoptimized
      />
    )
  }
  const initials = name.split(/\s+/).map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase()
  const color = teamColor(name)
  return (
    <span
      className={cn("cc-team-circle", size === "sm" && "cc-team-circle--sm")}
      style={{ "--tc": color } as React.CSSProperties}
    >
      {initials}
    </span>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shortAdvice(advice: string): string {
  const a = advice.toLowerCase()
  if (a.includes("home")) return "Home Win"
  if (a.includes("away")) return "Away Win"
  if (a.includes("draw")) return "Draw"
  if (a.includes("over")) return "Over 2.5"
  if (a.includes("btts") || a.includes("both")) return "BTTS"
  return advice.split(" ").slice(0, 2).join(" ")
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match
  selected?: boolean
  onSelect?: (match: Match) => void
  latestChange?: MatchChange
  compact?: boolean
  showLeague?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MatchCard({ match, selected, onSelect, latestChange, compact, showLeague = true }: MatchCardProps) {
  const router     = useRouter()
  const isLive     = match.status === "LIVE"
  const isFinished = match.status === "FINISHED"
  const isUpcoming = match.status === "UPCOMING"
  const conf       = match.prediction.confidence
  const tier       = confTier(conf)
  const hasPrediction = Boolean(
    match.prediction.advice && match.prediction.advice !== "No prediction available"
  )

  const valueEdge  = useMemo(() => calculateValueEdge(match), [match])
  const isValue    = valueEdge?.isValue === true
  const isHighConf = conf >= 72 && !isValue

  const showFooter = isValue || isHighConf || hasPrediction

  const homeScore = isLive || isFinished ? match.score.home : null
  const awayScore = isLive || isFinished ? match.score.away : null
  const homeWon   = isFinished && homeScore != null && awayScore != null && homeScore > awayScore
  const awayWon   = isFinished && homeScore != null && awayScore != null && awayScore > homeScore

  // Win-probability bar data (upcoming only)
  const probs = isUpcoming && !compact ? match.prediction.modelProbs : null

  const kickoff = new Date(match.kickoffISO)
  const isToday = kickoff.toDateString() === new Date().toDateString()

  const timeLabel = isLive
    ? `${match.minute ?? 0}′`
    : isFinished
      ? "FT"
      : isToday
        ? formatTime(match.kickoffISO)
        : `${formatShortDate(match.kickoffISO)} · ${formatTime(match.kickoffISO)}`

  return (
    <article
      className={cn(
        "cc-card",
        compact      && "cc-card--compact",
        selected     && "cc-card--selected",
        isValue      && "cc-card--value",
        isLive       && "cc-card--live",
        isFinished   && "cc-card--finished",
      )}
      onClick={() => { onSelect?.(match); router.push(`/match/${match.id}`) }}
      role="button"
      tabIndex={0}
      aria-label={`${match.home.name} vs ${match.away.name}`}
    >

      {/* ── Header: league • time ──────────────────── heart ── */}
      <div className="cc-card-header">
        <div className="cc-card-header-left">
          {showLeague && <span className="cc-card-league">{match.league}</span>}
          {showLeague && <span className="cc-card-sep" aria-hidden>•</span>}
          <span className={cn("cc-card-time", isLive && "cc-card-time--live")}>
            {timeLabel}
          </span>
        </div>
        <FavoritesSwitcher
          type="match"
          id={String(match.id)}
          label={`${match.home.short} vs ${match.away.short}`}
          meta={{ league: match.league }}
        />
      </div>

      {/* ── Teams: home | score | away ──── */}
      <div className="cc-card-body">

        {/* Home side */}
        <div className="cc-card-side cc-card-side--home">
          <div className="cc-card-side-top">
            <TeamCircle name={match.home.name} logo={match.home.logo} size={compact ? "sm" : "md"} />
            <span className={cn("cc-card-team-name", homeWon && "cc-card-team-name--winner")}>
              {match.home.name}
            </span>
          </div>
          {match.home.form && (
            <FormGuide form={match.home.form} className="cc-card-form" />
          )}
        </div>

        {/* Centre score */}
        <div className="cc-card-centre">
          {homeScore != null && awayScore != null ? (
            <span className={cn("cc-card-score-centre", isLive && "cc-card-score-centre--live")}>
              {homeScore} – {awayScore}
            </span>
          ) : (
            <span className="cc-card-kickoff">{timeLabel}</span>
          )}
        </div>

        {/* Away side */}
        <div className="cc-card-side cc-card-side--away">
          <div className="cc-card-side-top">
            <span className={cn("cc-card-team-name", awayWon && "cc-card-team-name--winner")}>
              {match.away.name}
            </span>
            <TeamCircle name={match.away.name} logo={match.away.logo} size={compact ? "sm" : "md"} />
          </div>
          {match.away.form && (
            <FormGuide form={match.away.form} className="cc-card-form cc-card-form--away" />
          )}
        </div>
      </div>

      {/* ── Win-probability bar (upcoming, non-compact) ── */}
      {probs && (
        <div className="cc-card-prob">
          <span className="cc-card-prob-label">{Math.round(probs.home * 100)}%</span>
          <div className="cc-card-prob-track">
            <div className="cc-card-prob-home" style={{ width: `${probs.home * 100}%` }} />
            <div className="cc-card-prob-draw" style={{ width: `${probs.draw * 100}%` }} />
            <div className="cc-card-prob-away" style={{ width: `${probs.away * 100}%` }} />
          </div>
          <span className="cc-card-prob-label cc-card-prob-label--r">
            {Math.round(probs.away * 100)}%
          </span>
        </div>
      )}

      {/* ── Footer: pills (left) · advice (right) ── */}
      {showFooter && (
        <div className="cc-card-footer">
          <div className="cc-card-pills">
            {isValue && (
              <span className="cc-card-pill cc-card-pill--value">
                ▲ VALUE +{(valueEdge!.edge * 100).toFixed(0)}%
              </span>
            )}
            {isHighConf && (
              <span className="cc-card-pill cc-card-pill--conf">
                ✦ {Math.round(conf)}%
              </span>
            )}
          </div>
          {hasPrediction && (
            <span className={cn("cc-card-advice", `cc-card-advice--${tier}`)}>
              {shortAdvice(match.prediction.advice)}
            </span>
          )}
        </div>
      )}

      {/* ── Change alert strip ── */}
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
