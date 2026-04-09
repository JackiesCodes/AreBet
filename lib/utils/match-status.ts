import type { ConfidenceTier, Match, MatchStatus } from "@/types/match"

export function statusLabel(match: Pick<Match, "status" | "minute">): string {
  switch (match.status) {
    case "LIVE":
      return match.minute != null ? `${match.minute}'` : "LIVE"
    case "UPCOMING":
      return "Upcoming"
    case "FINISHED":
      return "FT"
    default:
      return ""
  }
}

export type Tone = "live" | "ht" | "upcoming" | "finished" | "neutral"

export function statusTone(status: MatchStatus): Tone {
  switch (status) {
    case "LIVE":
      return "live"
    case "UPCOMING":
      return "upcoming"
    case "FINISHED":
      return "finished"
    default:
      return "neutral"
  }
}

/**
 * Tier confidence: <50 → "low", 50–70 → "mid", ≥70 → "high".
 * NaN-safe.
 */
export function confTier(value: number | null | undefined): ConfidenceTier {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0
  if (v >= 70) return "high"
  if (v >= 50) return "mid"
  return "low"
}

export function isUpcomingSoon(kickoffISO: string, withinMs = 60 * 60 * 1000): boolean {
  const t = new Date(kickoffISO).getTime()
  if (Number.isNaN(t)) return false
  const diff = t - Date.now()
  return diff > 0 && diff <= withinMs
}
