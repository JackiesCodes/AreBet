/**
 * AreBet Betting Tips Engine
 *
 * Computes per-match betting tips across multiple markets using a Poisson goal
 * model derived from the prediction's expected goals (xG) values.
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

import type { Match } from "@/types/match"
import { VALUE_THRESHOLD, inferModelProbs } from "./value-bet"

// ── Poisson helpers ───────────────────────────────────────────────────────────

/** Poisson PMF: P(X = k) for X ~ Poisson(lambda) */
function poissonPMF(lambda: number, k: number): number {
  if (k < 0) return 0
  if (lambda <= 0) return k === 0 ? 1 : 0
  // Log-space to avoid overflow for large k
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

/** P(Home Goals - Away Goals = diff) using a score matrix up to 8 goals each */
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

// ── Types ─────────────────────────────────────────────────────────────────────

export type TipCategory = "result" | "goals" | "btts" | "handicap" | "firstgoal" | "cleansheet"

export type TipConfidence = "high" | "mid" | "low"

export interface BettingTip {
  id: string
  market: string
  selection: string
  probability: number     // model probability 0–1
  modelProb: number       // alias for probability (used in value display)
  odds: number            // decimal bookmaker odds (0 = not available)
  impliedProb: number     // 1/odds market probability (0 if odds unavailable)
  edge: number            // model prob − implied prob
  isValue: boolean        // edge ≥ VALUE_THRESHOLD
  confidence: TipConfidence
  category: TipCategory
  rationale: string       // human-readable explanation
}

export interface MatchTips {
  matchId: number
  home: string
  away: string
  league: string
  kickoffISO: string
  status: string
  tips: BettingTip[]
}

// ── Tip builder ───────────────────────────────────────────────────────────────

function conf(prob: number): TipConfidence {
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
): BettingTip {
  const safeOdds = odds > 1 ? odds : 0
  const impliedProb = safeOdds > 0 ? 1 / safeOdds : 0
  const edge = impliedProb > 0 ? probability - impliedProb : 0
  const safeProp = Math.min(1, Math.max(0, probability))
  return {
    id,
    market,
    selection,
    probability: safeProp,
    modelProb: safeProp,
    odds: safeOdds,
    impliedProb,
    edge,
    isValue: edge >= VALUE_THRESHOLD,
    confidence: conf(probability),
    category,
    rationale,
  }
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateMatchTips(match: Match): MatchTips {
  const tips: BettingTip[] = []
  const { odds, prediction, home, away } = match
  const lH = Math.max(0.1, prediction.expectedGoals.home)
  const lA = Math.max(0.1, prediction.expectedGoals.away)
  const lTotal = lH + lA

  // ── 1. Match Result ───────────────────────────────────────────────────────
  // Use stored modelProbs from prediction API, or infer from confidence + advice
  const mp = prediction.modelProbs ?? inferModelProbs(prediction.confidence, prediction.advice)
  if (mp) {
    tips.push(tip(
      "result-home", "Match Result", `${home.name} to Win`,
      mp.home, odds.home, "result",
      `Model: ${(mp.home * 100).toFixed(0)}% — ${home.name} averaging ${lH.toFixed(1)} xG`,
    ))
    tips.push(tip(
      "result-draw", "Match Result", "Draw",
      mp.draw, odds.draw, "result",
      `Draw probability ${(mp.draw * 100).toFixed(0)}% from xG model (${lH.toFixed(1)}–${lA.toFixed(1)} xG)`,
    ))
    tips.push(tip(
      "result-away", "Match Result", `${away.name} to Win`,
      mp.away, odds.away, "result",
      `Model: ${(mp.away * 100).toFixed(0)}% — ${away.name} averaging ${lA.toFixed(1)} xG`,
    ))

    // ── 2. Double Chance ─────────────────────────────────────────────────────
    const dcHD = mp.home + mp.draw
    const dcDA = mp.draw + mp.away
    const dcHA = mp.home + mp.away
    tips.push(tip(
      "dc-1x", "Double Chance", `${home.name} or Draw`,
      dcHD, odds.dcHomeOrDraw ?? 0, "result",
      `${(dcHD * 100).toFixed(0)}% chance ${home.name} doesn't lose`,
    ))
    tips.push(tip(
      "dc-x2", "Double Chance", `Draw or ${away.name}`,
      dcDA, odds.dcDrawOrAway ?? 0, "result",
      `${(dcDA * 100).toFixed(0)}% chance ${away.name} doesn't lose`,
    ))
    tips.push(tip(
      "dc-12", "Double Chance", "Either Team Wins",
      dcHA, odds.dcHomeOrAway ?? 0, "result",
      `${(dcHA * 100).toFixed(0)}% chance the game won't end in a draw`,
    ))
  }

  // ── 3. Both Teams to Score ────────────────────────────────────────────────
  const pBTTS = (1 - poissonPMF(lH, 0)) * (1 - poissonPMF(lA, 0))
  const pBTTSNo = 1 - pBTTS
  tips.push(tip(
    "btts-yes", "Both Teams to Score", "Yes",
    pBTTS, odds.btts, "btts",
    `${home.name} ${lH.toFixed(1)} xG + ${away.name} ${lA.toFixed(1)} xG — both likely to score`,
  ))
  tips.push(tip(
    "btts-no", "Both Teams to Score", "No",
    pBTTSNo, odds.bttsNo ?? 0, "btts",
    `${(pBTTSNo * 100).toFixed(0)}% chance at least one team is kept out`,
  ))

  // ── 4. Total Goals ────────────────────────────────────────────────────────
  const pOver15 = 1 - poissonSumCDF(lH, lA, 1)
  const pOver25 = 1 - poissonSumCDF(lH, lA, 2)
  const pOver35 = 1 - poissonSumCDF(lH, lA, 3)
  const pUnder25 = 1 - pOver25
  const pUnder35 = 1 - pOver35

  tips.push(tip(
    "over-15", "Total Goals", "Over 1.5",
    pOver15, odds.over15 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pOver15 * 100).toFixed(0)}% chance of 2+ goals`,
  ))
  tips.push(tip(
    "over-25", "Total Goals", "Over 2.5",
    pOver25, odds.over25, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pOver25 * 100).toFixed(0)}% chance of 3+ goals`,
  ))
  tips.push(tip(
    "over-35", "Total Goals", "Over 3.5",
    pOver35, odds.over35 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pOver35 * 100).toFixed(0)}% chance of 4+ goals`,
  ))
  tips.push(tip(
    "under-25", "Total Goals", "Under 2.5",
    pUnder25, odds.under25 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pUnder25 * 100).toFixed(0)}% chance of 2 goals or fewer`,
  ))
  tips.push(tip(
    "under-35", "Total Goals", "Under 3.5",
    pUnder35, odds.under35 ?? 0, "goals",
    `${lTotal.toFixed(1)} total xG → ${(pUnder35 * 100).toFixed(0)}% chance of 3 goals or fewer`,
  ))

  // ── 5. First Goal Team ────────────────────────────────────────────────────
  // Rate model: P(home scores first | a goal is scored) ≈ lH / (lH + lA)
  const pHomeFirst = lH / lTotal
  const pAwayFirst = lA / lTotal
  tips.push(tip(
    "fg-home", "First Goal", `${home.name} to Score First`,
    pHomeFirst, 0, "firstgoal",
    `${home.name} attacking rate ${lH.toFixed(1)} xG vs ${away.name} ${lA.toFixed(1)} xG`,
  ))
  tips.push(tip(
    "fg-away", "First Goal", `${away.name} to Score First`,
    pAwayFirst, 0, "firstgoal",
    `${away.name} attacking rate ${lA.toFixed(1)} xG vs ${home.name} ${lH.toFixed(1)} xG`,
  ))

  // ── 6. Clean Sheet ────────────────────────────────────────────────────────
  const pHomeCS = poissonPMF(lA, 0)   // home keeps CS if away scores 0
  const pAwayCS = poissonPMF(lH, 0)   // away keeps CS if home scores 0
  tips.push(tip(
    "cs-home", "Clean Sheet", `${home.name}`,
    pHomeCS, 0, "cleansheet",
    `${away.name} averaging ${lA.toFixed(1)} xG — ${(pHomeCS * 100).toFixed(0)}% chance of shutout`,
  ))
  tips.push(tip(
    "cs-away", "Clean Sheet", `${away.name}`,
    pAwayCS, 0, "cleansheet",
    `${home.name} averaging ${lH.toFixed(1)} xG — ${(pAwayCS * 100).toFixed(0)}% chance of shutout`,
  ))

  // ── 7. Asian Handicap ─────────────────────────────────────────────────────
  // Home -1: home wins by 2+ = win; by 1 = push; draw/away win = loss
  let pHomeWinBy2Plus = 0
  for (let diff = 2; diff <= 8; diff++) pHomeWinBy2Plus += probGoalDiff(lH, lA, diff)

  const pHomeWinBy1 = probGoalDiff(lH, lA, 1)

  // Away +1: away wins or draws = win; home wins by 1 = push; home wins by 2+ = loss
  let pAwayOrDraw = 0
  for (let diff = 0; diff <= 8; diff++) pAwayOrDraw += probGoalDiff(lA, lH, diff)

  // Effective probability for +1 buyer (push counted as 50%)
  const pAway1Effective = pAwayOrDraw + pHomeWinBy1 * 0.5

  tips.push(tip(
    "hc-home-1", "Asian Handicap", `${home.name} -1`,
    pHomeWinBy2Plus, odds.handicapHome ?? 0, "handicap",
    `${(pHomeWinBy2Plus * 100).toFixed(0)}% for ${home.name} to win by 2+ (push if win by exactly 1)`,
  ))
  tips.push(tip(
    "hc-away-1", "Asian Handicap", `${away.name} +1`,
    pAway1Effective, odds.handicapAway ?? 0, "handicap",
    `${away.name} effective win rate ${(pAway1Effective * 100).toFixed(0)}% with +1 goal head start`,
  ))

  return {
    matchId: match.id,
    home: home.name,
    away: away.name,
    league: match.league,
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
  kickoffISO: string
  status: string
}

/**
 * Generate a flat list of tips across all matches, sorted by value edge first,
 * then by model probability. Only returns tips with probability >= 0.45.
 */
export function generateFeedTips(matches: Match[]): FeedTip[] {
  const result: FeedTip[] = []
  for (const match of matches) {
    if (match.status === "FINISHED") continue
    const { tips, matchId, home, away, league, kickoffISO, status } = generateMatchTips(match)
    for (const t of tips) {
      if (t.probability < 0.45) continue
      result.push({ ...t, matchId, home, away, league, kickoffISO, status })
    }
  }
  return result.sort((a, b) => {
    if (a.isValue !== b.isValue) return a.isValue ? -1 : 1
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
