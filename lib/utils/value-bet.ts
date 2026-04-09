import type { Match, ValueEdge, ModelProbabilities, PredictionFactor } from "@/types/match"

/** Minimum edge (probability points) to flag as a value bet */
export const VALUE_THRESHOLD = 0.05

/**
 * Remove bookmaker overround and return fair probabilities.
 * e.g. 1.80 / 3.40 / 4.50 → overround ~1.11 → fair probs sum to 1.0
 */
export function removemargin(homeOdds: number, drawOdds: number, awayOdds: number): ModelProbabilities {
  const total = 1 / homeOdds + 1 / drawOdds + 1 / awayOdds
  return {
    home: 1 / homeOdds / total,
    draw: 1 / drawOdds / total,
    away: 1 / awayOdds / total,
  }
}

/**
 * Infer model probabilities from a confidence score + advice string.
 * Used when API-Football prediction data is not available (demo mode).
 */
export function inferModelProbs(confidence: number, advice: string): ModelProbabilities {
  const c = confidence / 100
  const adv = advice.toLowerCase()

  if (adv.includes("home") || adv.includes("win") && !adv.includes("away")) {
    return { home: c, draw: (1 - c) * 0.45, away: (1 - c) * 0.55 }
  }
  if (adv.includes("away")) {
    return { home: (1 - c) * 0.55, draw: (1 - c) * 0.45, away: c }
  }
  if (adv.includes("draw") || adv.includes("double chance")) {
    return { home: (1 - c) * 0.5, draw: c, away: (1 - c) * 0.5 }
  }
  // Default: distribute confidence across all outcomes
  return { home: c * 0.5 + 0.2, draw: 0.25, away: c * 0.3 + 0.1 }
}

/**
 * Calculate the best value edge across all 3 outcomes.
 * Returns null if odds are missing or zero.
 */
export function calculateValueEdge(match: Match): ValueEdge | null {
  const { odds, prediction } = match
  if (!odds.home || !odds.draw || !odds.away) return null

  const modelProbs = prediction.modelProbs ?? inferModelProbs(prediction.confidence, prediction.advice)
  const fairProbs = removemargin(odds.home, odds.draw, odds.away)

  const candidates = [
    {
      selection: "home" as const,
      modelProb: modelProbs.home,
      impliedProb: fairProbs.home,
      edge: modelProbs.home - fairProbs.home,
      odds: odds.home,
    },
    {
      selection: "draw" as const,
      modelProb: modelProbs.draw,
      impliedProb: fairProbs.draw,
      edge: modelProbs.draw - fairProbs.draw,
      odds: odds.draw,
    },
    {
      selection: "away" as const,
      modelProb: modelProbs.away,
      impliedProb: fairProbs.away,
      edge: modelProbs.away - fairProbs.away,
      odds: odds.away,
    },
  ]

  // Pick best edge
  const best = candidates.sort((a, b) => b.edge - a.edge)[0]

  return {
    ...best,
    isValue: best.edge >= VALUE_THRESHOLD,
  }
}

/**
 * Build human-readable prediction factors from match data.
 * These explain WHY AreBet is predicting what it's predicting.
 */
export function buildPredictionFactors(match: Match): PredictionFactor[] {
  const factors: PredictionFactor[] = []

  // 1. Home advantage
  factors.push({
    label: "Home advantage",
    impact: "positive",
    detail: `${match.home.name} playing at ${match.venue}`,
    side: "home",
  })

  // 2. Recent form
  if (match.home.form.length >= 3) {
    const homeWins = (match.home.form.match(/W/g) ?? []).length
    const awayWins = (match.away.form.match(/W/g) ?? []).length
    if (homeWins > awayWins + 1) {
      factors.push({
        label: "Superior form",
        impact: "positive",
        detail: `${match.home.name} form: ${match.home.form} vs ${match.away.form}`,
        side: "home",
      })
    } else if (awayWins > homeWins + 1) {
      factors.push({
        label: "Away team in form",
        impact: "positive",
        detail: `${match.away.name} form: ${match.away.form} vs ${match.home.form}`,
        side: "away",
      })
    }
  }

  // 3. xG differential
  const xgDiff = match.prediction.expectedGoals.home - match.prediction.expectedGoals.away
  if (Math.abs(xgDiff) >= 0.4) {
    factors.push({
      label: "xG model edge",
      impact: xgDiff > 0 ? "positive" : "negative",
      detail: `Expected goals: ${match.prediction.expectedGoals.home.toFixed(1)} – ${match.prediction.expectedGoals.away.toFixed(1)}`,
      side: xgDiff > 0 ? "home" : "away",
    })
  }

  // 4. H2H record
  if (match.h2h && match.h2h.length >= 3) {
    const homeH2HWins = match.h2h.filter(
      (r) => r.home === match.home.name && r.score.home > r.score.away,
    ).length
    const awayH2HWins = match.h2h.filter(
      (r) => r.away === match.away.name && r.score.away > r.score.home,
    ).length
    if (homeH2HWins >= 3) {
      factors.push({
        label: "H2H dominance",
        impact: "positive",
        detail: `${match.home.name} won ${homeH2HWins} of last ${match.h2h.length} meetings`,
        side: "home",
      })
    } else if (awayH2HWins >= 3) {
      factors.push({
        label: "H2H record",
        impact: "positive",
        detail: `${match.away.name} won ${awayH2HWins} of last ${match.h2h.length} meetings`,
        side: "away",
      })
    }
  }

  // 5. Odds movement signal (if market history available)
  if (match.marketHistory.length >= 2) {
    const first = match.marketHistory[0]
    const last = match.marketHistory[match.marketHistory.length - 1]
    const homeDrop = first.home - last.home
    if (homeDrop > 0.15) {
      factors.push({
        label: "Steam move",
        impact: "positive",
        detail: `Home odds dropped from ${first.home.toFixed(2)} → ${last.home.toFixed(2)} (sharp money)`,
        side: "home",
      })
    } else if (homeDrop < -0.15) {
      factors.push({
        label: "Steam move",
        impact: "positive",
        detail: `Away odds shortened from ${first.away.toFixed(2)} → ${last.away.toFixed(2)} (sharp money)`,
        side: "away",
      })
    }
  }

  // 6. Live momentum (if match is in play)
  if (match.status === "LIVE" && match.stats) {
    const homePossession = match.stats.possession.h
    const homeXg = match.stats.xg.h
    const awayXg = match.stats.xg.a
    if (homePossession > 60 && homeXg > awayXg * 1.5) {
      factors.push({
        label: "Live dominance",
        impact: "positive",
        detail: `${match.home.name} controlling with ${homePossession}% possession and ${homeXg.toFixed(1)} xG`,
        side: "home",
      })
    }
  }

  // Cap at 4 factors for readability
  return factors.slice(0, 4)
}

/** Kelly criterion stake suggestion (fractional Kelly at 25%) */
export function kellyStake(edge: ValueEdge, bankroll: number): number {
  if (!edge.isValue || edge.odds <= 1) return 0
  const b = edge.odds - 1
  const p = edge.modelProb
  const q = 1 - p
  const fullKelly = (b * p - q) / b
  const fractional = Math.max(0, fullKelly * 0.25) // quarter Kelly = safer
  return Math.round(fractional * bankroll * 100) / 100
}
