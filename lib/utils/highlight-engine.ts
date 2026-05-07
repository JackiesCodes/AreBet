/**
 * Highlighted Matches Scoring Engine
 *
 * Computes a composite highlight_score (0–1) for each match to power the
 * "Highlighted Matches" section on the homepage.
 *
 * Formula:
 *   highlight_score =
 *     (popularity_proxy  * 0.35)   — bet count + favorite count (normalised)
 *     + (league_weight   * 0.25)   — LEAGUE_POP prestige normalised to 0-1
 *     + (importance_score * 0.15)  — finals, derbies, tight matches
 *     + (kickoff_urgency  * 0.10)  — imminence of kickoff
 *     + (live_score       * 0.10)  — currently live
 *     + (editorial_boost  * 0.05)  — admin-set override
 *
 * All component functions are pure and NaN-safe — they never throw.
 */

import type { Match } from "@/types/match"
import { LEAGUE_POP } from "@/lib/utils/league-groups"

// ── Weights ───────────────────────────────────────────────────────────────────

export const HIGHLIGHT_WEIGHTS = {
  popularity:  0.35,
  league:      0.25,
  importance:  0.15,
  urgency:     0.10,
  live:        0.10,
  editorial:   0.05,
} as const

// ── Per-component scorers ─────────────────────────────────────────────────────

/**
 * Popularity proxy: normalised combination of bet count and favorite count.
 * Weights bets (0.7) higher than favorites (0.3) since bets signal stronger intent.
 */
export function popularityScore(
  betCount: number,
  favoriteCount: number,
  maxBets: number,
  maxFavs: number,
): number {
  const normBets = maxBets > 0 ? Math.min(betCount, maxBets) / maxBets : 0
  const normFavs = maxFavs > 0 ? Math.min(favoriteCount, maxFavs) / maxFavs : 0
  return normBets * 0.7 + normFavs * 0.3
}

/** League weight: LEAGUE_POP prestige normalised to 0-1. Unknown leagues → 0.05. */
export function leagueWeightScore(leagueId: number | undefined): number {
  if (!leagueId) return 0.05
  const pop = LEAGUE_POP[leagueId] ?? 5
  return pop / 100  // LEAGUE_POP max is 100 (UEFA CL)
}

/**
 * Match importance detection.
 * Checks team/league names for keywords + uses model probabilities to detect
 * tight/competitive matches. Returns 0-1.
 */
const FINAL_TERMS    = ["final", "playoff", "play-off", "semi-final", "quarter-final", "semifinal", "quarterfinal", "championship", "title decider"]
const DERBY_TERMS    = ["derby", "clásico", "clasico", "classico", "el clasico"]
const RELEGATION_TERMS = ["relegation", "survival"]

export function importanceScore(match: Match): number {
  const label = [
    match.home.name,
    match.away.name,
    match.league,
  ].join(" ").toLowerCase()

  if (FINAL_TERMS.some((t) => label.includes(t)))      return 1.0
  if (DERBY_TERMS.some((t) => label.includes(t)))       return 0.85
  if (RELEGATION_TERMS.some((t) => label.includes(t))) return 0.75

  // Tight match detection via model probabilities — competitive = exciting
  const probs = match.prediction.modelProbs
  if (probs) {
    const maxProb = Math.max(probs.home, probs.draw, probs.away)
    if (maxProb < 0.40) return 0.70   // Very tight (max team prob < 40%)
    if (maxProb < 0.50) return 0.55   // Competitive
    if (maxProb < 0.60) return 0.35   // Slight lean
  }

  return 0.15  // Default
}

/**
 * Kickoff urgency.
 * Live: 1.0 → within 1h: 0.85 → within 4h: 0.65 → today: 0.35 → tomorrow: 0.15
 */
export function kickoffUrgencyScore(match: Match, now = new Date()): number {
  if (match.status === "LIVE")     return 1.0
  if (match.status === "FINISHED") return 0

  const msUntil = new Date(match.kickoffISO).getTime() - now.getTime()

  if (msUntil <= 0)                          return 0.90  // Imminent / just kicked off
  if (msUntil <= 30  * 60_000)              return 0.90  // ≤ 30 min
  if (msUntil <= 60  * 60_000)              return 0.85  // ≤ 1 h
  if (msUntil <= 4   * 60 * 60_000)         return 0.65  // ≤ 4 h
  if (msUntil <= 12  * 60 * 60_000)         return 0.45  // ≤ 12 h
  if (msUntil <= 24  * 60 * 60_000)         return 0.30  // Today
  if (msUntil <= 48  * 60 * 60_000)         return 0.15  // Tomorrow
  return 0.05
}

/** Live score: 1.0 when live, 0 otherwise. */
export function liveScore(match: Match): number {
  return match.status === "LIVE" ? 1.0 : 0
}

// ── Aggregate scorer ──────────────────────────────────────────────────────────

export interface HighlightBreakdown {
  total:          number
  popularity:     number
  league:         number
  importance:     number
  urgency:        number
  live:           number
  editorial:      number
}

export interface MatchPopularity {
  betCount:      number
  favoriteCount: number
}

export function computeHighlightScore(
  match: Match,
  editorialBoost: number,          // 0-1
  popularity: MatchPopularity,
  maxBets: number,
  maxFavs: number,
  now = new Date(),
): HighlightBreakdown {
  const pop       = popularityScore(popularity.betCount, popularity.favoriteCount, maxBets, maxFavs)
  const league    = leagueWeightScore(match.leagueId)
  const imp       = importanceScore(match)
  const urgency   = kickoffUrgencyScore(match, now)
  const live      = liveScore(match)
  const editorial = Math.max(0, Math.min(1, editorialBoost))

  const W = HIGHLIGHT_WEIGHTS
  const total =
    pop       * W.popularity +
    league    * W.league     +
    imp       * W.importance +
    urgency   * W.urgency    +
    live      * W.live       +
    editorial * W.editorial

  return { total, popularity: pop, league, importance: imp, urgency, live, editorial }
}

// ── Batch scorer ──────────────────────────────────────────────────────────────

export interface ScoredMatch extends Match {
  highlightScore:     number
  highlightBreakdown: HighlightBreakdown
  /** Admin-set label e.g. "Top Pick", "Derby", "Editor's Choice" */
  highlightLabel?:    string
}

/**
 * Score and sort an array of matches by highlight_score descending.
 *
 * @param matches        Current match feed
 * @param editorialBoosts Map<fixtureId, { score: number; label?: string }>
 * @param popularityMap  Map<fixtureId, MatchPopularity>
 * @param now            Injectable for testing
 */
export function scoreAndRankMatches(
  matches: Match[],
  editorialBoosts: Map<number, { score: number; label?: string | null }>,
  popularityMap:   Map<number, MatchPopularity>,
  now = new Date(),
): ScoredMatch[] {
  // Normalisation anchors across the current feed
  const allPop  = [...popularityMap.values()]
  const maxBets = Math.max(1, ...allPop.map((p) => p.betCount))
  const maxFavs = Math.max(1, ...allPop.map((p) => p.favoriteCount))

  return matches
    .map((match) => {
      const boost    = editorialBoosts.get(match.id)
      const pop      = popularityMap.get(match.id) ?? { betCount: 0, favoriteCount: 0 }
      const breakdown = computeHighlightScore(
        match,
        boost?.score ?? 0,
        pop,
        maxBets,
        maxFavs,
        now,
      )
      return {
        ...match,
        highlightScore:     breakdown.total,
        highlightBreakdown: breakdown,
        highlightLabel:     boost?.label ?? undefined,
      } satisfies ScoredMatch
    })
    .sort((a, b) => b.highlightScore - a.highlightScore)
}
