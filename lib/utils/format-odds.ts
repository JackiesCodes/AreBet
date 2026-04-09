import type { OddsFormat } from "@/types/user"

/**
 * Format a decimal odds value to the requested representation.
 */
export function formatOdds(decimal: number, format: OddsFormat = "decimal"): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return "—"
  switch (format) {
    case "fractional":
      return toFractional(decimal)
    case "american":
      return toAmerican(decimal)
    case "decimal":
    default:
      return decimal.toFixed(2)
  }
}

function toFractional(decimal: number): string {
  const numerator = decimal - 1
  // Try simple denominators first
  for (let den = 1; den <= 20; den++) {
    const num = numerator * den
    if (Math.abs(num - Math.round(num)) < 0.02) {
      return `${Math.round(num)}/${den}`
    }
  }
  // Fall back: rounded ratio with denominator 100
  return `${Math.round(numerator * 100)}/100`
}

function toAmerican(decimal: number): string {
  if (decimal >= 2) {
    return `+${Math.round((decimal - 1) * 100)}`
  }
  return `${Math.round(-100 / (decimal - 1))}`
}

/** Compute implied probability from decimal odds (0–1). */
export function impliedProbability(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 0) return 0
  return 1 / decimal
}
