import type { BookmakerOdds, MarketHistoryPoint, Match } from "@/types/match"
import { hashString, seededRandom } from "@/lib/utils/seeded-random"

const BOOKMAKERS = ["Bet365", "PaddyPower", "William Hill", "Pinnacle", "Betfair"]

export function buildBookmakerOdds(seed: string, base: { home: number; draw: number; away: number }): BookmakerOdds[] {
  const rand = seededRandom(hashString(seed + "bm"))
  return BOOKMAKERS.map((bookmaker) => ({
    bookmaker,
    home: roundOdd(base.home * (0.96 + rand() * 0.08)),
    draw: roundOdd(base.draw * (0.96 + rand() * 0.08)),
    away: roundOdd(base.away * (0.96 + rand() * 0.08)),
  }))
}

export function buildMarketHistory(
  seed: string,
  base: { home: number; draw: number; away: number },
  points = 12,
): MarketHistoryPoint[] {
  const rand = seededRandom(hashString(seed + "mh"))
  const out: MarketHistoryPoint[] = []
  const start = Date.now() - points * 60 * 60 * 1000
  for (let i = 0; i < points; i++) {
    const drift = (rand() - 0.5) * 0.15
    out.push({
      ts: new Date(start + i * 60 * 60 * 1000).toISOString(),
      home: roundOdd(base.home + drift),
      draw: roundOdd(base.draw + drift * 0.6),
      away: roundOdd(base.away - drift * 0.8),
    })
  }
  return out
}

export function roundOdd(n: number): number {
  return Math.max(1.05, Math.round(n * 100) / 100)
}

let nextId = 1000
export function genId(): number {
  return ++nextId
}

export function isoOffsetMinutes(mins: number): string {
  return new Date(Date.now() + mins * 60 * 1000).toISOString()
}

/**
 * Build a match with sensible defaults computed from compact input.
 */
export function buildMatch(input: Partial<Match> & {
  league: string
  country: string
  venue: string
  homeName: string
  homeShort: string
  awayName: string
  awayShort: string
  kickoffMinutes?: number // minutes from now
  baseOdds: { home: number; draw: number; away: number }
  homeForm?: string
  awayForm?: string
  confidence?: number
  advice?: string
  status?: Match["status"]
  score?: { home: number; away: number }
  minute?: number
}): Match {
  const id = input.id ?? genId()
  const kickoff = input.kickoffISO ?? isoOffsetMinutes(input.kickoffMinutes ?? 60)
  const seed = `${input.homeName}-${input.awayName}-${id}`
  const expGoalsH = 0.8 + (3 - input.baseOdds.home) * 0.4
  const expGoalsA = 0.7 + (3 - input.baseOdds.away) * 0.4

  return {
    id,
    league: input.league,
    country: input.country,
    venue: input.venue,
    kickoffISO: kickoff,
    status: input.status ?? "UPCOMING",
    minute: input.minute,
    home: { name: input.homeName, short: input.homeShort, form: input.homeForm ?? "WWLDW" },
    away: { name: input.awayName, short: input.awayShort, form: input.awayForm ?? "DLWWD" },
    score: input.score ?? { home: 0, away: 0 },
    odds: {
      ...input.baseOdds,
      over25: roundOdd(1.65 + (Math.abs(input.baseOdds.home - input.baseOdds.away) * 0.05)),
      btts: roundOdd(1.75 + (Math.abs(input.baseOdds.home - input.baseOdds.away) * 0.04)),
    },
    marketHistory: buildMarketHistory(seed, input.baseOdds),
    bookmakerOdds: buildBookmakerOdds(seed, input.baseOdds),
    prediction: {
      confidence: input.confidence ?? 60,
      advice: input.advice ?? `${input.homeShort} or Draw`,
      expectedGoals: { home: round1(expGoalsH), away: round1(expGoalsA) },
    },
    events: input.events ?? [],
    stats: input.stats ?? {
      possession: { h: 50, a: 50 },
      shots: { h: 0, a: 0 },
      shotsOnTarget: { h: 0, a: 0 },
      xg: { h: 0, a: 0 },
      passAccuracy: { h: 80, a: 80 },
      corners: { h: 0, a: 0 },
    },
    h2h: input.h2h ?? defaultH2H(input.homeName, input.awayName),
    playerRatings: input.playerRatings,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function defaultH2H(home: string, away: string): Match["h2h"] {
  return [
    { date: "2024-09-15", home, away, score: { home: 2, away: 1 } },
    { date: "2024-04-02", home: away, away: home, score: { home: 0, away: 0 } },
    { date: "2023-11-20", home, away, score: { home: 1, away: 3 } },
    { date: "2023-05-08", home: away, away: home, score: { home: 2, away: 2 } },
  ]
}
