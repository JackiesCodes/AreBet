/**
 * Pure calculation functions for Trust Layer model performance stats.
 * All functions are side-effect free and operate on SignalRecord[].
 */

import type {
  SignalRecord,
  ModelSummary,
  TierPerformance,
  CalibrationPoint,
  ValueSpotRecord,
  ConfidenceTierLabel,
} from "@/types/trust"

// ── Helpers ─────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/**
 * ROI assuming flat £1 stake on every signal.
 * ROI% = ((sum of returns) - (total staked)) / (total staked) * 100
 * For a win: return = odds. For a loss: return = 0.
 */
function calcROI(records: SignalRecord[]): number {
  if (records.length === 0) return 0
  const totalStaked = records.length
  const totalReturned = records.reduce((sum, r) => {
    return sum + (r.correct && r.odds ? r.odds : 0)
  }, 0)
  return ((totalReturned - totalStaked) / totalStaked) * 100
}

// ── Overall model summary ────────────────────────────────────────────────────

export function computeModelSummary(records: SignalRecord[], isDemo = false): ModelSummary {
  if (records.length === 0) {
    return {
      totalSignals: 0,
      correctSignals: 0,
      hitRate: 0,
      avgConfidence: 0,
      avgOdds: 0,
      roi: 0,
      dataFrom: "",
      dataTo: "",
      isDemo,
    }
  }

  const correct = records.filter((r) => r.correct)
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalSignals: records.length,
    correctSignals: correct.length,
    hitRate: (correct.length / records.length) * 100,
    avgConfidence: avg(records.map((r) => r.confidence)),
    avgOdds: avg(records.filter((r) => r.odds != null).map((r) => r.odds!)),
    roi: calcROI(records),
    dataFrom: sorted[0].date,
    dataTo: sorted[sorted.length - 1].date,
    isDemo,
  }
}

// ── Tier performance ─────────────────────────────────────────────────────────

const TIER_LABELS: Record<"high" | "mid" | "low", ConfidenceTierLabel> = {
  high: "High (≥72%)",
  mid: "Mid (50–71%)",
  low: "Low (<50%)",
}

export function computeTierPerformance(records: SignalRecord[]): TierPerformance[] {
  const tiers = (["high", "mid", "low"] as const).map((tier) => {
    const subset = records.filter((r) => r.confidenceTier === tier)
    if (subset.length === 0) {
      return {
        tier,
        label: TIER_LABELS[tier],
        totalSignals: 0,
        correctSignals: 0,
        hitRate: 0,
        avgConfidence: 0,
        avgOdds: 0,
        roi: 0,
      }
    }
    const correct = subset.filter((r) => r.correct)
    return {
      tier,
      label: TIER_LABELS[tier],
      totalSignals: subset.length,
      correctSignals: correct.length,
      hitRate: (correct.length / subset.length) * 100,
      avgConfidence: avg(subset.map((r) => r.confidence)),
      avgOdds: avg(subset.filter((r) => r.odds != null).map((r) => r.odds!)),
      roi: calcROI(subset),
    }
  })
  return tiers
}

// ── Confidence calibration ───────────────────────────────────────────────────

/**
 * Buckets signals into 5-percentage-point bands (0–5, 5–10, … 95–100)
 * and computes actual hit rate per bucket.
 * Only returns buckets with at least 1 signal.
 */
export function computeCalibration(records: SignalRecord[]): CalibrationPoint[] {
  // Build buckets keyed by lower bound: 0, 5, 10, …, 95
  const buckets = new Map<number, SignalRecord[]>()
  for (let lo = 0; lo < 100; lo += 5) {
    buckets.set(lo, [])
  }

  for (const r of records) {
    const lo = Math.min(95, Math.floor(r.confidence / 5) * 5)
    buckets.get(lo)!.push(r)
  }

  const points: CalibrationPoint[] = []
  for (const [lo, subset] of buckets) {
    if (subset.length === 0) continue
    const hi = lo + 5
    const midpoint = lo + 2.5
    const hitRate = (subset.filter((r) => r.correct).length / subset.length) * 100
    points.push({
      label: `${lo}–${hi}%`,
      midpoint,
      totalSignals: subset.length,
      hitRate,
      calibrationError: Math.abs(hitRate - midpoint),
    })
  }

  return points.sort((a, b) => a.midpoint - b.midpoint)
}

// ── Value spot track record ──────────────────────────────────────────────────

export function computeValueSpotRecord(records: SignalRecord[]): ValueSpotRecord {
  const flagged = records.filter((r) => r.hadValueEdge)
  if (flagged.length === 0) {
    return { totalFlagged: 0, profitableCount: 0, hitRate: 0, avgEdgePct: 0, roi: 0 }
  }
  const profitable = flagged.filter((r) => r.correct)
  return {
    totalFlagged: flagged.length,
    profitableCount: profitable.length,
    hitRate: (profitable.length / flagged.length) * 100,
    avgEdgePct: avg(flagged.filter((r) => r.valueEdgePct != null).map((r) => r.valueEdgePct!)),
    roi: calcROI(flagged),
  }
}

// ── Recent form (last N days) ────────────────────────────────────────────────

export function computeRecentSummary(
  records: SignalRecord[],
  days = 14,
): ModelSummary {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const iso = cutoff.toISOString().slice(0, 10)
  const recent = records.filter((r) => r.date >= iso)
  return computeModelSummary(recent, true)
}

// ── Per-league breakdown ─────────────────────────────────────────────────────

export interface LeaguePerformance {
  league: string
  totalSignals: number
  hitRate: number
  roi: number
  avgConfidence: number
}

export function computeLeagueBreakdown(records: SignalRecord[]): LeaguePerformance[] {
  const map = new Map<string, SignalRecord[]>()
  for (const r of records) {
    if (!map.has(r.league)) map.set(r.league, [])
    map.get(r.league)!.push(r)
  }

  const results: LeaguePerformance[] = []
  for (const [league, subset] of map) {
    const correct = subset.filter((r) => r.correct)
    results.push({
      league,
      totalSignals: subset.length,
      hitRate: (correct.length / subset.length) * 100,
      roi: calcROI(subset),
      avgConfidence: avg(subset.map((r) => r.confidence)),
    })
  }

  return results.sort((a, b) => b.totalSignals - a.totalSignals)
}
