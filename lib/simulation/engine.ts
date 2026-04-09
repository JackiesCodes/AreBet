import type { Match, MatchEvent } from "@/types/match"

/**
 * Module-level mutable state. Persists across poll calls during a single
 * server process / browser session.
 */
interface SimState {
  initialized: boolean
  lastTick: number
  rngSeed: number
  matchOverrides: Map<number, MatchOverride>
}

interface MatchOverride {
  status?: Match["status"]
  minute?: number
  score?: { home: number; away: number }
  events?: MatchEvent[]
  stats?: Match["stats"]
  oddsAdjust?: { home: number; draw: number; away: number }
}

const state: SimState = {
  initialized: false,
  lastTick: 0,
  rngSeed: 0xa5a5a5,
  matchOverrides: new Map(),
}

function rand(): number {
  // Mulberry32-ish on the running seed
  state.rngSeed = (state.rngSeed + 0x6d2b79f5) | 0
  let t = Math.imul(state.rngSeed ^ (state.rngSeed >>> 15), 1 | state.rngSeed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const PLAYERS_HOME = ["Saka", "Ødegaard", "Saliba", "Rice", "Martinelli", "Havertz"]
const PLAYERS_AWAY = ["Haaland", "De Bruyne", "Foden", "Rodri", "Bernardo", "Walker"]

/**
 * Apply one simulation tick. Returns a new array (does not mutate input).
 */
export function applySimulationTick(matches: Match[]): Match[] {
  const now = Date.now()
  const elapsed = state.lastTick === 0 ? 30_000 : now - state.lastTick
  state.lastTick = now
  state.initialized = true

  return matches.map((match) => {
    const override = state.matchOverrides.get(match.id) ?? {}
    const merged = mergeOverride(match, override)
    const evolved = evolveMatch(merged, elapsed)
    state.matchOverrides.set(match.id, captureOverride(merged, evolved))
    return evolved
  })
}

function mergeOverride(match: Match, override: MatchOverride): Match {
  return {
    ...match,
    status: override.status ?? match.status,
    minute: override.minute ?? match.minute,
    score: override.score ?? match.score,
    events: override.events ?? match.events,
    stats: override.stats ?? match.stats,
    odds: override.oddsAdjust
      ? { ...match.odds, ...override.oddsAdjust }
      : match.odds,
  }
}

function captureOverride(_old: Match, current: Match): MatchOverride {
  return {
    status: current.status,
    minute: current.minute,
    score: current.score,
    events: current.events,
    stats: current.stats,
    oddsAdjust: { home: current.odds.home, draw: current.odds.draw, away: current.odds.away },
  }
}

function evolveMatch(match: Match, _elapsed: number): Match {
  let next: Match = { ...match }
  const kickoffMs = new Date(match.kickoffISO).getTime()
  const nowMs = Date.now()

  // UPCOMING → LIVE when kickoff time has passed
  if (next.status === "UPCOMING" && Number.isFinite(kickoffMs) && nowMs >= kickoffMs) {
    next = { ...next, status: "LIVE", minute: 1, score: { home: 0, away: 0 } }
  }

  if (next.status !== "LIVE") return next

  // Tick the minute (slowly drift forward)
  const currentMinute = next.minute ?? 1
  const newMinute = Math.min(95, currentMinute + (rand() < 0.6 ? 1 : 0))

  // Random goal probability ~8% per side per poll
  let homeScore = next.score.home
  let awayScore = next.score.away
  const newEvents: MatchEvent[] = [...(next.events ?? [])]

  if (rand() < 0.08) {
    homeScore += 1
    newEvents.push({
      minute: newMinute,
      team: "home",
      type: "goal",
      player: pick(PLAYERS_HOME),
      detail: pick(["Right foot", "Left foot", "Header", "Penalty"]),
    })
  }
  if (rand() < 0.08) {
    awayScore += 1
    newEvents.push({
      minute: newMinute,
      team: "away",
      type: "goal",
      player: pick(PLAYERS_AWAY),
      detail: pick(["Right foot", "Left foot", "Header"]),
    })
  }
  if (rand() < 0.04) {
    newEvents.push({
      minute: newMinute,
      team: rand() < 0.5 ? "home" : "away",
      type: "card",
      player: pick(rand() < 0.5 ? PLAYERS_HOME : PLAYERS_AWAY),
      detail: "Yellow",
    })
  }
  if (rand() < 0.03) {
    newEvents.push({
      minute: newMinute,
      team: rand() < 0.5 ? "home" : "away",
      type: "sub",
      player: pick(rand() < 0.5 ? PLAYERS_HOME : PLAYERS_AWAY),
      detail: "Substitution",
    })
  }

  // Nudge stats
  const stats = next.stats ?? {
    possession: { h: 50, a: 50 },
    shots: { h: 0, a: 0 },
    shotsOnTarget: { h: 0, a: 0 },
    xg: { h: 0, a: 0 },
    passAccuracy: { h: 80, a: 80 },
    corners: { h: 0, a: 0 },
  }
  const possDrift = (rand() - 0.5) * 4
  const newStats = {
    ...stats,
    possession: {
      h: clamp(stats.possession.h + possDrift, 30, 70),
      a: clamp(stats.possession.a - possDrift, 30, 70),
    },
    shots: {
      h: stats.shots.h + (rand() < 0.4 ? 1 : 0),
      a: stats.shots.a + (rand() < 0.4 ? 1 : 0),
    },
    shotsOnTarget: {
      h: stats.shotsOnTarget.h + (rand() < 0.2 ? 1 : 0),
      a: stats.shotsOnTarget.a + (rand() < 0.2 ? 1 : 0),
    },
    xg: { h: round1(stats.xg.h + (homeScore > next.score.home ? 0.6 : rand() * 0.1)), a: round1(stats.xg.a + (awayScore > next.score.away ? 0.6 : rand() * 0.1)) },
    passAccuracy: {
      h: clamp(stats.passAccuracy.h + (rand() - 0.5), 70, 95),
      a: clamp(stats.passAccuracy.a + (rand() - 0.5), 70, 95),
    },
    corners: {
      h: stats.corners.h + (rand() < 0.1 ? 1 : 0),
      a: stats.corners.a + (rand() < 0.1 ? 1 : 0),
    },
  }

  // Adjust odds based on lead
  let { home: oh, draw: od, away: oa } = next.odds
  const lead = homeScore - awayScore
  if (lead > 0) {
    oh = Math.max(1.05, oh - 0.05 * lead)
    oa = oa + 0.07 * lead
    od = od + 0.04 * lead
  } else if (lead < 0) {
    oa = Math.max(1.05, oa + 0.05 * lead)
    oh = oh - 0.07 * lead
    od = od - 0.04 * lead
  }
  const newOdds = {
    ...next.odds,
    home: round2(oh),
    draw: round2(od),
    away: round2(oa),
  }

  next = {
    ...next,
    minute: newMinute,
    score: { home: homeScore, away: awayScore },
    events: newEvents.slice(-12), // keep last 12 events
    stats: newStats,
    odds: newOdds,
  }

  // LIVE → FINISHED at minute >= 90
  if (newMinute >= 90) {
    next = { ...next, status: "FINISHED", minute: 90 }
  }

  return next
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)] as T
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Reset simulation state (test/debug). */
export function resetSimulation(): void {
  state.initialized = false
  state.lastTick = 0
  state.matchOverrides.clear()
}
