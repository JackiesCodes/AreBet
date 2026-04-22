/**
 * AreBet Betting Tips Engine
 *
 * Computes per-match betting tips across multiple markets using a Poisson goal
 * model derived from the prediction's expected goals (xG) values.
 *
 * Data quality tiers:
 *  - "confirmed"  API returned both xG and model probabilities for this match
 *  - "model"      API returned xG only — result probs derived via Poisson
 *  - "estimated"  No API data — default xG used, all tips are generic estimates
 *
 * Markets covered:
 *  - Match Result (1X2)
 *  - Double Chance (1X / X2 / 12)
 *  - Both Teams to Score (Yes / No)
 *  - Total Goals Over/Under 1.5 / 2.5 / 3.5
 *  - First Goal Team
 *  - Clean Sheet (Home / Away)
 *  - Asian Handicap Home -1 / Away +1
 */

import type { Match, ModelProbabilities } from "@/types/match"
import { VALUE_THRESHOLD } from "./value-bet"

// ── Poisson helpers ───────────────────────────────────────────────────────────

/** Poisson PMF: P(X = k) for X ~ Poisson(lambda) */
function poissonPMF(lambda: number, k: number): number {
  if (k < 0) return 0
  if (lambda <= 0) return k === 0 ? 1 : 0
  let logP = -lambda + k * Math.log(lambda)
  for (let i = 1; i <= k; i++) logP -= Math.log(i)
  return Math.exp(logP)
}

/** P(X + Y <= n) where X ~ Poisson(lH), Y ~ Poisson(lA) */
function poissonSumCDF(lambdaH: number, lambdaA: number, maxTotal: number): number {
  let p = 0
  for (let t = 0; t <= maxTotal; t++) {
    for (let h = 0; h <= t; h++) {
      p += poissonPMF(lambdaH, h) * poissonPMF(lambdaA, t - h)
    }
  }
  return Math.min(1, p)
}

/** P(Home Goals - Away Goals = diff) using a score matrix up to 10 goals each */
function probGoalDiff(lambdaH: number, lambdaA: number, diff: number): number {
  const MAX = 10
  let p = 0
  for (let h = 0; h <= MAX; h++) {
    const a = h - diff
    if (a < 0 || a > MAX) continue
    p += poissonPMF(lambdaH, h) * poissonPMF(lambdaA, a)
  }
  return p
}

/**
 * Derive home/draw/away probabilities directly from the Poisson score matrix.
 * Far more accurate than text-heuristic inference — probabilities always sum to 1,
 * and reflect the actual xG inputs rather than generic patterns.
 */
function poissonResultProbs(lambdaH: number, lambdaA: number): ModelProbabilities {
  const MAX = 10
  let home = 0, draw = 0, away = 0
  for (let h = 0; h <= MAX; h++) {
    for (let a = 0; a <= MAX; a++) {
      const p = poissonPMF(lambdaH, h) * poissonPMF(lambdaA, a)
      if (h > a) home += p
      else if (h === a) draw += p
      else away += p
    }
  }
  return { home, draw, away }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TipCategory = "result" | "goals" | "btts" | "handicap" | "firstgoal" | "cleansheet"

export type TipConfidence = "high" | "mid" | "low"

/** How reliable the tip's underlying data is */
export type TipDataQuality = "confirmed" | "model" | "estimated"

export interface BettingTip {
  id: string
  market: string
  selection: string
  probability: number       // model probability 0–1
  modelProb: number         // alias for probability (used in value display)
  odds: number              // decimal bookmaker odds (0 = not available)
  impliedProb: number       // 1/odds market probability (0 if odds unavailable)
  edge: number              // model prob − implied prob
  isValue: boolean          // edge ≥ VALUE_THRESHOLD
  confidence: TipConfidence
  category: TipCategory
  rationale: string         // human-readable explanation
  dataQuality: TipDataQuality
  /** kept for backwards compat — prefer dataQuality */
  isInferred: boolean
}

export interface MatchTips {
  matchId: number
  home: string
  away: string
  league: string
  leagueId: number | undefined
  country: string
  kickoffISO: string
  status: string
  tips: BettingTip[]
}

// ── Tip builder ───────────────────────────────────────────────────────────────

function conf(prob: number, quality: TipDataQuality): TipConfidence {
  // Cap confidence at "mid" for estimated tips — default xG produces generic probs
  if (quality === "estimated") {
    return prob >= 0.65 ? "mid" : "low"
  }
  if (prob >= 0.65) return "high"
  if (prob >= 0.50) return "mid"
  return "low"
}

function tip(
  id: string,
  market: string,
  selection: string,
  probability: number,
  odds: number,
  category: TipCategory,
  rationale: string,
  quality: TipDataQuality,
): BettingTip {
  const safeOdds = odds > 1 ? odds : 0
  const impliedProb = safeOdds > 0 ? 1 / safeOdds : 0
  const edge = impliedProb > 0 ? probability - impliedProb : 0
  const safeProp = Math.min(1, Math.max(0, probability))
  const isInferred = quality !== "confirmed"
  return {
    id,
    market,
    selection,
    probability: safeProp,
    modelProb: safeProp,
    odds: safeOdds,
    impliedProb,
    edge,
    // Only flag value on confirmed or model-quality tips — estimated xG is not reliable
    isValue: quality !== "estimated" && edge >= VALUE_THRESHOLD,
    confidence: conf(probability, quality),
    category,
    rationale,
    isInferred,
    dataQuality: quality,
  }
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateMatchTips(match: Match): MatchTips {
  const tips: BettingTip[] = []
  const { odds, prediction, home, away } = match
  const lH = Math.max(0.1, prediction.expectedGoals.home)
  const lA = Math.max(0.1, prediction.expectedGoals.away)
  const lTotal = lH + lA

  // ── Data quality tier for this match ─────────────────────────────────────
  // confirmed: API supplied both xG and model probabilities
  // model:     API supplied xG — result probs derived via Poisson
  // estimated: default xG (1.2/1.0) — all tips are generic, not match-specific
  const hasRealXg = prediction.hasRealPrediction === true
  const hasApiProbs = !!prediction.modelProbs
  const xgQuality: TipDataQuality = hasRealXg ? (hasApiProbs ? "confirmed" : "model") : "estimated"

  // ── 1. Match Result ───────────────────────────────────────────────────────
  // Use API model probs when available; otherwise derive from Poisson score matrix.
  // This replaces the old text-heuristic inferModelProbs which produced non-normalised
  // probabilities and ignored the actual xG values entirely.
  const mp = prediction.modelProbs ?? poissonResultProbs(lH, lA)
  // Result quality: confirmed if API provided probs; model if Poisson-derived from real xG;
  // estimated if using default xG (all matches will produce the same ~0.42/0.26/0.32 split)
  const resultQuality: TipDataQuality = hasApiProbs ? "confirmed" : xgQuality === "estimated" ? "estimated" : "model"

  const xgLabel = hasRealXg
    ? `${lH.toFixed(1)}–${lA.toFixed(1)} xG`
    : `est. xG (avg)`

  tips.push(tip(
    "result-home", "Match Result", `${home.name} to Win`,
    mp.home, odds.home, "result",
    `${(mp.home * 100).toFixed(0)}% — ${xgLabel}${hasApiProbs ? " · API model" : " · Poisson"}`,
    resultQuality,
  ))
  tips.push(tip(
    "result-draw", "Match Result", "Draw",
    mp.draw, odds.draw, "result",
    `Draw ${(mp.draw * 100).toFixed(0)}% — ${xgLabel}${hasApiProbs ? " · API model" : " · Poisson"}`,
    resultQuality,
  ))
  tips.push(tip(
    "result-away", "Match Result", `${away.name} to Win`,
    mp.away, odds.away, "result",
    `${(mp.away * 100).toFixed(0)}% — ${xgLabel}${hasApiProbs ? " · API model" : " · Poisson"}`,
    resultQuality,
  ))

  // ── 2. Double Chance ─────────────────────────────────────────────────────
  const dcHD = mp.home + mp.draw
  const dcDA = mp.draw + mp.away
  const dcHA = mp.home + mp.away
  tips.push(tip(
    "dc-1x", "Double Chance", `${home.name} or Draw`,
    dcHD, odds.dcHomeOrDraw ?? 0, "result",
    `${(dcHD * 100).toFixed(0)}% chance ${home.name} doesn't lose`,
    resultQuality,
  ))
  tips.push(tip(
    "dc-x2", "Double Chance", `Draw or ${away.name}`,
    dcDA, odds.dcDrawOrAway ?? 0, "result",
    `${(dcDA * 100).toFixed(0)}% chance ${away.name} doesn't lose`,
    resultQuality,
  ))
  tips.push(tip(
    "dc-12", "Double Chance", "Either Team Wins",
    dcHA, odds.dcHomeOrAway ?? 0, "result",
    `${(dcHA * 100).toFixed(0)}% chance the game won't end in a draw`,
    resultQuality,
  ))

  // ── 3. Both Teams to Score ────────────────────────────────────────────────
  const pBTTS = (1 - poissonPMF(lH, 0)) * (1 - poissonPMF(lA, 0))
  const pBTTSNo = 1 - pBTTS
  tips.push(tip(
    "btts-yes", "Both Teams to Score", "Yes",
    pBTTS, odds.btts, "btts",
    `${home.name} ${lH.toFixed(1)} xG + ${away.name} ${lA.toFixed(1)} xG — both likely to score`,
    xgQuality,
  ))
  tips.push(tip(
    "btts-no", "Both Teams to Score", "No",
    pBTTSNo, odds.bttsNo ?? 0, "btts",
    `${(pBTTSNo * 100).toFixed(0)}% chance at least one team is kept out`,
    xgQuality,
  ))

  // ── 4. Total Goals ────────────────────────────────────────────────────────
  const pOver15 = 1 - poissonSumCDF(lH, lA, 1)
  const pOver25 = 1 - poissonSumCDF(lH, lA, 2)
  const pOver35 = 1 - poissonSumCDF(lH, lA, 3)
  const pUnder25 = poissonSumCDF(lH, lA, 2)
  const pUnder35 = poissonSumCDF(lH, lA, 3)

  tips.push(tip(
    "over-15", "Total Goals", "Over 1.5",
    pOver15, odds.over15 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pOver15 * 100).toFixed(0)}% chance of 2+ goals`,
    xgQuality,
  ))
  tips.push(tip(
    "over-25", "Total Goals", "Over 2.5",
    pOver25, odds.over25, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pOver25 * 100).toFixed(0)}% chance of 3+ goals`,
    xgQuality,
  ))
  tips.push(tip(
    "over-35", "Total Goals", "Over 3.5",
    pOver35, odds.over35 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pOver35 * 100).toFixed(0)}% chance of 4+ goals`,
    xgQuality,
  ))
  tips.push(tip(
    "under-25", "Total Goals", "Under 2.5",
    pUnder25, odds.under25 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pUnder25 * 100).toFixed(0)}% chance of 2 goals or fewer`,
    xgQuality,
  ))
  tips.push(tip(
    "under-35", "Total Goals", "Under 3.5",
    pUnder35, odds.under35 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pUnder35 * 100).toFixed(0)}% chance of 3 goals or fewer`,
    xgQuality,
  ))

  // ── 5. First Goal Team ────────────────────────────────────────────────────
  const pHomeFirst = lH / lTotal
  const pAwayFirst = lA / lTotal
  tips.push(tip(
    "fg-home", "First Goal", `${home.name} to Score First`,
    pHomeFirst, 0, "firstgoal",
    `${home.name} attacking rate ${lH.toFixed(1)} xG vs ${away.name} ${lA.toFixed(1)} xG`,
    xgQuality,
  ))
  tips.push(tip(
    "fg-away", "First Goal", `${away.name} to Score First`,
    pAwayFirst, 0, "firstgoal",
    `${away.name} attacking rate ${lA.toFixed(1)} xG vs ${home.name} ${lH.toFixed(1)} xG`,
    xgQuality,
  ))

  // ── 6. Clean Sheet ────────────────────────────────────────────────────────
  const pHomeCS = poissonPMF(lA, 0)
  const pAwayCS = poissonPMF(lH, 0)
  tips.push(tip(
    "cs-home", "Clean Sheet", `${home.name}`,
    pHomeCS, 0, "cleansheet",
    `${away.name} averaging ${lA.toFixed(1)} xG — ${(pHomeCS * 100).toFixed(0)}% chance of shutout`,
    xgQuality,
  ))
  tips.push(tip(
    "cs-away", "Clean Sheet", `${away.name}`,
    pAwayCS, 0, "cleansheet",
    `${home.name} averaging ${lH.toFixed(1)} xG — ${(pAwayCS * 100).toFixed(0)}% chance of shutout`,
    xgQuality,
  ))

  // ── 7. Asian Handicap ─────────────────────────────────────────────────────
  let pHomeWinBy2Plus = 0
  for (let diff = 2; diff <= 8; diff++) pHomeWinBy2Plus += probGoalDiff(lH, lA, diff)

  const pHomeWinBy1 = probGoalDiff(lH, lA, 1)

  let pAwayOrDraw = 0
  for (let diff = 0; diff <= 8; diff++) pAwayOrDraw += probGoalDiff(lA, lH, diff)

  const pAway1Effective = pAwayOrDraw + pHomeWinBy1 * 0.5

  tips.push(tip(
    "hc-home-1", "Asian Handicap", `${home.name} -1`,
    pHomeWinBy2Plus, odds.handicapHome ?? 0, "handicap",
    `${(pHomeWinBy2Plus * 100).toFixed(0)}% for ${home.name} to win by 2+ (push if win by exactly 1)`,
    xgQuality,
  ))
  tips.push(tip(
    "hc-away-1", "Asian Handicap", `${away.name} +1`,
    pAway1Effective, odds.handicapAway ?? 0, "handicap",
    `${away.name} effective win rate ${(pAway1Effective * 100).toFixed(0)}% with +1 goal head start`,
    xgQuality,
  ))

  return {
    matchId: match.id,
    home: home.name,
    away: away.name,
    league: match.league,
    leagueId: match.leagueId,
    country: match.country,
    kickoffISO: match.kickoffISO,
    status: match.status,
    tips,
  }
}

// ── Feed helpers ──────────────────────────────────────────────────────────────

export type FeedTip = BettingTip & {
  matchId: number
  home: string
  away: string
  league: string
  leagueId: number | undefined
  country: string
  kickoffISO: string
  status: string
}

const QUALITY_ORDER: Record<TipDataQuality, number> = {
  confirmed: 0,
  model: 1,
  estimated: 2,
}

/**
 * Generate a flat list of tips across all matches.
 * Sort priority: value tips first, then by data quality (confirmed > model > estimated),
 * then by probability. Tips with probability < 0.45 are excluded.
 * Estimated-quality tips (generic default xG) are deprioritised to the bottom.
 */
export function generateFeedTips(matches: Match[]): FeedTip[] {
  const result: FeedTip[] = []
  for (const match of matches) {
    if (match.status === "FINISHED") continue
    const { tips, matchId, home, away, league, leagueId, country, kickoffISO, status } = generateMatchTips(match)
    for (const t of tips) {
      if (t.probability < 0.45) continue
      result.push({ ...t, matchId, home, away, league, leagueId, country, kickoffISO, status })
    }
  }
  return result.sort((a, b) => {
    // Value tips always surface first
    if (a.isValue !== b.isValue) return a.isValue ? -1 : 1
    // Then sort by data quality
    const qDiff = QUALITY_ORDER[a.dataQuality] - QUALITY_ORDER[b.dataQuality]
    if (qDiff !== 0) return qDiff
    // Finally by probability
    return b.probability - a.probability
  })
}

/** Filter helpers for the predictions page UI */
export const TIP_CATEGORY_LABELS: Record<TipCategory, string> = {
  result: "Match Result",
  goals: "Goals",
  btts: "BTTS",
  handicap: "Handicap",
  firstgoal: "First Goal",
  cleansheet: "Clean Sheet",
}

export const TIP_CATEGORY_ICONS: Record<TipCategory, string> = {
  result: "🏆",
  goals: "⚽",
  btts: "🎯",
  handicap: "⚖️",
  firstgoal: "🥇",
  cleansheet: "🛡️",
}
