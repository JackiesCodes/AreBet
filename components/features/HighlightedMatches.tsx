"use client"

/**
 * HighlightedMatches
 *
 * Hero section displayed at the top of the homepage.
 * Shows the top N matches scored by the highlight engine —
 * weighted combination of league prestige, kickoff urgency,
 * live status, match importance, prediction quality, and admin boosts.
 *
 * Data flow:
 *   useMatchIntelligence() → current feed
 *   /api/highlights/boosts → editorial boosts (loaded once, refreshed every 5 min)
 *   scoreAndRankMatches()  → client-side re-scoring on every feed update
 *
 * Popularity data (bet counts, favorites) is only fetched server-side via
 * /api/highlights when the section first mounts, then updated every 2 minutes.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { scoreAndRankMatches, type ScoredMatch } from "@/lib/utils/highlight-engine"
import { fetchEditorialBoosts } from "@/lib/services/highlights"
import type { MatchPopularity } from "@/lib/utils/highlight-engine"
import { cn } from "@/lib/utils/cn"

const HIGHLIGHT_LIMIT     = 5
const BOOST_REFRESH_MS    = 5 * 60_000   // refresh editorial boosts every 5 min
const POPULAR_REFRESH_MS  = 2 * 60_000   // refresh popularity counts every 2 min

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtKickoff(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const msUntil = d.getTime() - now.getTime()

  if (msUntil > 0 && msUntil <= 60 * 60_000) {
    const mins = Math.ceil(msUntil / 60_000)
    return `${mins}m`
  }
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  })
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate()  === n.getDate()
}

function isKickingOffSoon(iso: string): boolean {
  const ms = new Date(iso).getTime() - Date.now()
  return ms > 0 && ms <= 60 * 60_000
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LivePip() {
  return (
    <span className="hm-live-pip" aria-label="Live">
      <span className="hm-live-pip-dot" aria-hidden />
      LIVE
    </span>
  )
}

function SoonPip() {
  return <span className="hm-soon-pip">SOON</span>
}

function BoostLabel({ label }: { label: string }) {
  return <span className="hm-boost-label">{label}</span>
}

function TeamLogo({ src, name }: { src?: string; name: string }) {
  if (!src) {
    return (
      <div className="hm-team-logo hm-team-logo--placeholder" aria-hidden>
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={name}
      width={36}
      height={36}
      className="hm-team-logo"
    />
  )
}

function ScoreBar({ score }: { score: number }) {
  // Visual 0-5 dot indicator of highlight strength
  const filled = Math.round(score * 5)
  return (
    <div className="hm-score-bar" title={`Highlight score: ${(score * 100).toFixed(0)}%`} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cn("hm-score-dot", i < filled && "hm-score-dot--filled")} />
      ))}
    </div>
  )
}

// ── Match Card ────────────────────────────────────────────────────────────────

function HighlightCard({ match, rank }: { match: ScoredMatch; rank: number }) {
  const router  = useRouter()
  const isLive  = match.status === "LIVE"
  const soon    = !isLive && isKickingOffSoon(match.kickoffISO)
  const hasValue = match.prediction.valueEdge?.isValue === true

  return (
    <article
      className={cn(
        "hm-card",
        isLive && "hm-card--live",
        rank === 0 && "hm-card--featured",
      )}
      role="button"
      tabIndex={0}
      aria-label={`${match.home.name} vs ${match.away.name}`}
      onClick={() => router.push(`/match/${match.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          router.push(`/match/${match.id}`)
        }
      }}
    >
      {/* Top row: league + badges */}
      <div className="hm-card-header">
        <span className="hm-league-name">{match.league}</span>
        <div className="hm-badges">
          {match.highlightLabel && <BoostLabel label={match.highlightLabel} />}
          {isLive  && <LivePip />}
          {soon    && <SoonPip />}
          {hasValue && <span className="hm-value-badge">Value</span>}
        </div>
      </div>

      {/* Teams + score */}
      <div className="hm-teams">
        <div className="hm-team">
          <TeamLogo src={match.home.logo} name={match.home.name} />
          <div className="hm-team-info">
            <span className="hm-team-name">{match.home.name}</span>
            {match.home.form && <span className="hm-team-form">{match.home.form}</span>}
          </div>
        </div>

        <div className="hm-score-block">
          {isLive || match.status === "FINISHED" ? (
            <div className="hm-score">
              <span className="hm-score-home">{match.score.home}</span>
              <span className="hm-score-sep">—</span>
              <span className="hm-score-away">{match.score.away}</span>
            </div>
          ) : (
            <div className="hm-kickoff">
              <span className="hm-kickoff-time">{fmtKickoff(match.kickoffISO)}</span>
              {!isToday(match.kickoffISO) && (
                <span className="hm-kickoff-date">{fmtDate(match.kickoffISO)}</span>
              )}
            </div>
          )}
          {isLive && match.minute != null && (
            <span className="hm-minute">{match.minute}&apos;</span>
          )}
        </div>

        <div className="hm-team hm-team--away">
          <div className="hm-team-info">
            <span className="hm-team-name">{match.away.name}</span>
            {match.away.form && <span className="hm-team-form">{match.away.form}</span>}
          </div>
          <TeamLogo src={match.away.logo} name={match.away.name} />
        </div>
      </div>

      {/* Footer: confidence + odds + score indicator */}
      <div className="hm-card-footer">
        <span className="hm-confidence">
          {match.prediction.confidence}% confidence
        </span>
        {match.odds.home > 0 && (
          <span className="hm-odds-strip">
            <span className="hm-odd">{match.odds.home.toFixed(2)}</span>
            <span className="hm-odd-sep">·</span>
            <span className="hm-odd">{match.odds.draw.toFixed(2)}</span>
            <span className="hm-odd-sep">·</span>
            <span className="hm-odd">{match.odds.away.toFixed(2)}</span>
          </span>
        )}
        <ScoreBar score={match.highlightScore} />
      </div>
    </article>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function HighlightSkeleton() {
  return (
    <div className="hm-card hm-card--skeleton" aria-hidden>
      <div className="hm-skel hm-skel--line hm-skel--short" />
      <div className="hm-skel hm-skel--teams" />
      <div className="hm-skel hm-skel--line hm-skel--medium" />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function HighlightedMatches() {
  const { matches, loading } = useMatchIntelligence()

  // Editorial boosts — fetched once then refreshed on a slow interval
  const [boosts, setBoosts] = useState<Map<number, { score: number; label: string | null }>>(new Map())
  const boostTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Popularity counts — fetched from the server-side API (has service-role access)
  const [popularityMap, setPopularityMap] = useState<Map<number, MatchPopularity>>(new Map())
  const popularTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevIdsRef = useRef<string>("")

  // Load editorial boosts
  useEffect(() => {
    const load = () => fetchEditorialBoosts().then(setBoosts)
    load()
    boostTimerRef.current = setInterval(load, BOOST_REFRESH_MS)
    return () => { if (boostTimerRef.current) clearInterval(boostTimerRef.current) }
  }, [])

  // Load popularity via server API when match IDs change
  useEffect(() => {
    if (matches.length === 0) return
    const ids = matches.map((m) => m.id).sort().join(",")
    if (ids === prevIdsRef.current) return
    prevIdsRef.current = ids

    const loadPopularity = async () => {
      try {
        const res = await fetch(`/api/highlights?limit=20`)
        if (!res.ok) return
        const data: { highlights: Array<{ id: number; popularity: MatchPopularity }> } = await res.json()
        const map = new Map<number, MatchPopularity>()
        for (const h of data.highlights) {
          if (h.popularity) map.set(h.id, h.popularity)
        }
        if (map.size > 0) setPopularityMap(map)
      } catch { /* graceful */ }
    }
    loadPopularity()

    // Refresh popularity on a timer so client scoring improves over time
    if (popularTimerRef.current) clearInterval(popularTimerRef.current)
    popularTimerRef.current = setInterval(loadPopularity, POPULAR_REFRESH_MS)

    return () => { if (popularTimerRef.current) clearInterval(popularTimerRef.current) }
  }, [matches])

  // Score + rank client-side on every feed update
  const highlighted = useMemo(() => {
    if (matches.length === 0) return []
    return scoreAndRankMatches(matches, boosts, popularityMap)
      .filter((m) => m.status !== "FINISHED")  // Don't highlight finished matches
      .slice(0, HIGHLIGHT_LIMIT)
  }, [matches, boosts, popularityMap])

  // Don't render section if no data
  if (!loading && highlighted.length === 0) return null

  return (
    <section className="hm-section" aria-label="Highlighted matches">
      <div className="hm-section-header">
        <h2 className="hm-section-title">Highlighted Matches</h2>
        <span className="hm-section-sub">Top picks based on league prestige, kickoff timing &amp; model confidence</span>
      </div>

      <div className="hm-rail">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <HighlightSkeleton key={i} />)
          : highlighted.map((m, i) => (
              <HighlightCard key={m.id} match={m} rank={i} />
            ))
        }
      </div>
    </section>
  )
}

