import type { BookmakerOdds, MarketHistoryPoint, Match, MatchOdds } from "@/types/match"
import { hashString, seededRandom } from "@/lib/utils/seeded-random"

/** Build all odds markets for demo matches using seeded random + xG estimates */
export function buildExtendedOdds(
  seed: string,
  base: { home: number; draw: number; away: number },
  lH: number,
  lA: number,
): MatchOdds {
  const rand = seededRandom(hashString(seed + "odds"))
  const lTotal = lH + lA
  // Slight jitter so each match feels distinct
  const jitter = () => 0.97 + rand() * 0.06

  // Over/Under — derived from combined xG
  const over15Base = lTotal > 2.5 ? 1.25 : lTotal > 2.0 ? 1.40 : 1.55
  const over25Base = lTotal > 2.5 ? 1.72 : lTotal > 2.0 ? 1.90 : 2.10
  const over35Base = lTotal > 2.5 ? 2.80 : lTotal > 2.0 ? 3.20 : 3.80

  // BTTS — both keepers busy if lH > 0.9 and lA > 0.9
  const bttsBase = (lH > 0.9 && lA > 0.9) ? 1.75 : 2.10
  const bttsNoBase = roundOdd(1 / (1 - 1 / bttsBase) * 0.93)

  // Double chance — derived from 1X2
  const invH = 1 / base.home, invD = 1 / base.draw, invA = 1 / base.away
  const totalInv = invH + invD + invA
  const pH = invH / totalInv, pD = invD / totalInv, pA = invA / totalInv
  const dc1X  = roundOdd(1 / (pH + pD) * 1.03)
  const dcX2  = roundOdd(1 / (pD + pA) * 1.03)
  const dc12  = roundOdd(1 / (pH + pA) * 1.03)

  // Asian handicap — home favourite gets -1, away gets +1
  const hcHome = roundOdd((base.home * 1.6) * jitter())
  const hcAway = roundOdd((base.away * 0.75) * jitter())

  return {
    home: base.home,
    draw: base.draw,
    away: base.away,
    over25: roundOdd(over25Base * jitter()),
    btts: roundOdd(bttsBase * jitter()),
    over15: roundOdd(over15Base * jitter()),
    over35: roundOdd(over35Base * jitter()),
    under25: roundOdd((1 / (1 - 1 / over25Base) * 0.94) * jitter()),
    under35: roundOdd((1 / (1 - 1 / over35Base) * 0.94) * jitter()),
    bttsNo: bttsNoBase,
    dcHomeOrDraw: dc1X,
    dcDrawOrAway: dcX2,
    dcHomeOrAway: dc12,
    handicapHome: hcHome,
    handicapAway: hcAway,
  }
}

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
    odds: buildExtendedOdds(seed, input.baseOdds, expGoalsH, expGoalsA),
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
