"use client"

import { useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils/cn"
import type { Match } from "@/types/match"
import { useSelectedMatch } from "@/contexts/SelectedMatchContext"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import { FormGuide } from "@/components/primitives/FormGuide"
import { FavoritesSwitcher } from "@/components/features/nav/FavoritesSwitcher"
import { OddsButton } from "@/components/features/betslip/OddsButton"

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

// ── Props ──────────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match
  selected?: boolean
  onSelect?: (match: Match) => void
  compact?: boolean
  showLeague?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MatchCard({ match, selected, onSelect, compact, showLeague = true }: MatchCardProps) {
  const router     = useRouter()
  const { setSelectedMatch } = useSelectedMatch()
  const isLive     = match.status === "LIVE"
  const isFinished = match.status === "FINISHED"
  const isUpcoming = match.status === "UPCOMING"

  // Win-probability bar data (upcoming only)
  const probs = isUpcoming && !compact ? match.prediction?.modelProbs : null

  const homeScore = isLive || isFinished ? match.score.home : null
  const awayScore = isLive || isFinished ? match.score.away : null
  const homeWon   = isFinished && homeScore != null && awayScore != null && homeScore > awayScore
  const awayWon   = isFinished && homeScore != null && awayScore != null && awayScore > homeScore

  const kickoff = new Date(match.kickoffISO)
  const isToday = kickoff.toDateString() === new Date().toDateString()

  const timeLabel = isLive
    ? `${match.minute ?? 0}′`
    : isFinished
      ? "FT"
      : isToday
        ? formatTime(match.kickoffISO)
        : `${formatShortDate(match.kickoffISO)} · ${formatTime(match.kickoffISO)}`

  // Accessible label includes the current score / time so screen-reader users
  // have all essential info without opening the detail page.
  const scoreLabel = isLive
    ? `${match.score.home}–${match.score.away}, ${match.minute ?? 0} minutes`
    : isFinished
      ? `Final score ${match.score.home}–${match.score.away}`
      : `Kickoff ${timeLabel}`

  const cardLabel = `${match.home.name} vs ${match.away.name}, ${match.league}. ${scoreLabel}.`

  return (
    <article
      className={cn(
        "cc-card",
        compact      && "cc-card--compact",
        selected     && "cc-card--selected",
        isLive       && "cc-card--live",
        isFinished   && "cc-card--finished",
      )}
      onClick={() => { onSelect?.(match); setSelectedMatch(match); router.push(`/match/${match.id}`) }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect?.(match)
          router.push(`/match/${match.id}`)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
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

        {/* Centre score — aria-live so screen readers announce score changes */}
        <div
          className="cc-card-centre"
          aria-live={isLive ? "polite" : undefined}
          aria-atomic={isLive ? "true" : undefined}
          aria-label={isLive ? `Score: ${homeScore}–${awayScore}` : undefined}
        >
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

      {/* ── Odds buttons (upcoming, non-compact) ── */}
      {isUpcoming && !compact && match.odds && match.odds.home > 0 && (
        <div className="odds-row" onClick={(e) => e.stopPropagation()} role="group" aria-label="Match odds">
          <OddsButton
            fixtureId={match.id}
            matchLabel={`${match.home.name} vs ${match.away.name}`}
            league={match.league}
            market="MATCH_WINNER"
            marketLabel="Match Winner"
            selection="HOME"
            selectionLabel={match.home.short || "Home"}
            odds={match.odds.home}
            kickoffISO={match.kickoffISO}
          />
          {match.odds.draw > 0 && (
            <OddsButton
              fixtureId={match.id}
              matchLabel={`${match.home.name} vs ${match.away.name}`}
              league={match.league}
              market="MATCH_WINNER"
              marketLabel="Match Winner"
              selection="DRAW"
              selectionLabel="Draw"
              odds={match.odds.draw}
              kickoffISO={match.kickoffISO}
            />
          )}
          <OddsButton
            fixtureId={match.id}
            matchLabel={`${match.home.name} vs ${match.away.name}`}
            league={match.league}
            market="MATCH_WINNER"
            marketLabel="Match Winner"
            selection="AWAY"
            selectionLabel={match.away.short || "Away"}
            odds={match.odds.away}
            kickoffISO={match.kickoffISO}
          />
        </div>
      )}
    </article>
  )
}
