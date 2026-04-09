import { hashString, seededRandom } from "@/lib/utils/seeded-random"

export interface OddsHistoryPoint {
  index: number
  value: number
}

/**
 * Generate a 60-point sparkline data series, deterministic per matchId.
 * Centered around the supplied baseOdds with mild drift.
 */
export function generateOddsHistory(matchId: number, baseOdds: number, points = 60): OddsHistoryPoint[] {
  const rand = seededRandom(hashString(`spark-${matchId}-${baseOdds}`))
  const out: OddsHistoryPoint[] = []
  let value = baseOdds
  for (let i = 0; i < points; i++) {
    const drift = (rand() - 0.5) * 0.08
    value = Math.max(1.05, value + drift)
    out.push({ index: i, value: Math.round(value * 100) / 100 })
  }
  return out
}
