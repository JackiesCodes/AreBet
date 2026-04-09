import type { Match, SortKey } from "@/types/match"

const safe = (n: unknown, fallback = 0): number =>
  typeof n === "number" && Number.isFinite(n) ? n : fallback

const statusOrder: Record<Match["status"], number> = {
  LIVE: 0,
  UPCOMING: 1,
  FINISHED: 2,
}

/**
 * Rank/sort match list. NaN-safe.
 * - confidence: highest first
 * - kickoff: earliest first (live first by status)
 * - odds: lowest favorite first
 * - league: alpha by league name then kickoff
 */
export function rankMatches(matches: Match[], key: SortKey = "kickoff"): Match[] {
  const list = [...matches]

  list.sort((a, b) => {
    // Status always weighed first for kickoff sort
    const statusDelta = statusOrder[a.status] - statusOrder[b.status]

    switch (key) {
      case "confidence": {
        const av = safe(a.prediction?.confidence)
        const bv = safe(b.prediction?.confidence)
        if (bv !== av) return bv - av
        return statusDelta || safe(new Date(a.kickoffISO).getTime()) - safe(new Date(b.kickoffISO).getTime())
      }
      case "odds": {
        const av = Math.min(safe(a.odds?.home, 99), safe(a.odds?.draw, 99), safe(a.odds?.away, 99))
        const bv = Math.min(safe(b.odds?.home, 99), safe(b.odds?.draw, 99), safe(b.odds?.away, 99))
        if (av !== bv) return av - bv
        return statusDelta
      }
      case "league": {
        const cmp = (a.league || "").localeCompare(b.league || "")
        if (cmp !== 0) return cmp
        return statusDelta || safe(new Date(a.kickoffISO).getTime()) - safe(new Date(b.kickoffISO).getTime())
      }
      case "kickoff":
      default: {
        if (statusDelta !== 0) return statusDelta
        return safe(new Date(a.kickoffISO).getTime()) - safe(new Date(b.kickoffISO).getTime())
      }
    }
  })

  return list
}
