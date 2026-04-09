import type {
  ApiFixture,
  ApiOddsFixture,
  ApiPredictionFixture,
  ApiEvent,
  ApiTeamStatistics,
} from "./types"
import type {
  Match,
  MatchStatus,
  MatchOdds,
  MatchEvent,
  MatchEventType,
  MatchStats,
  H2HRecord,
  BookmakerOdds,
  MatchPrediction,
  MarketHistoryPoint,
  PlayerRatings,
  PlayerRating,
} from "@/types/match"

// Map API status short code -> our MatchStatus
function mapStatus(short: string): MatchStatus {
  const live = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT", "SUSP"]
  const finished = ["FT", "AET", "PEN", "AWD", "WO"]
  if (live.includes(short)) return "LIVE"
  if (finished.includes(short)) return "FINISHED"
  return "UPCOMING"
}

// Map API event type -> our MatchEventType
function mapEventType(type: string, detail: string): MatchEventType {
  if (type === "Goal") return "goal"
  if (type === "Card") return "card"
  if (type === "subst") return "sub"
  if (detail.toLowerCase().includes("goal")) return "goal"
  return "card"
}

function mapEvents(events: ApiEvent[], homeTeamId: number): MatchEvent[] {
  return events.map((e) => ({
    minute: e.time.elapsed,
    team: e.team.id === homeTeamId ? "home" : "away",
    type: mapEventType(e.type, e.detail),
    player: e.player.name,
    detail: e.detail,
  }))
}

function getStatValue(stats: Array<{ type: string; value: string | number | null }>, key: string): number {
  const stat = stats.find((s) => s.type === key)
  if (!stat || stat.value === null) return 0
  const v = String(stat.value).replace("%", "")
  return parseFloat(v) || 0
}

function mapStats(statistics: ApiTeamStatistics[], homeTeamId: number): MatchStats | undefined {
  if (!statistics || statistics.length < 2) return undefined

  const homeStats = statistics.find((s) => s.team.id === homeTeamId)?.statistics ?? []
  const awayStats = statistics.find((s) => s.team.id !== homeTeamId)?.statistics ?? []

  return {
    possession: {
      h: getStatValue(homeStats, "Ball Possession"),
      a: getStatValue(awayStats, "Ball Possession"),
    },
    shots: {
      h: getStatValue(homeStats, "Total Shots"),
      a: getStatValue(awayStats, "Total Shots"),
    },
    shotsOnTarget: {
      h: getStatValue(homeStats, "Shots on Goal"),
      a: getStatValue(awayStats, "Shots on Goal"),
    },
    xg: {
      h: getStatValue(homeStats, "expected_goals") || getStatValue(homeStats, "xG"),
      a: getStatValue(awayStats, "expected_goals") || getStatValue(awayStats, "xG"),
    },
    passAccuracy: {
      h: getStatValue(homeStats, "Passes %"),
      a: getStatValue(awayStats, "Passes %"),
    },
    corners: {
      h: getStatValue(homeStats, "Corner Kicks"),
      a: getStatValue(awayStats, "Corner Kicks"),
    },
  }
}

function mapOdds(oddsFixture: ApiOddsFixture): {
  odds: MatchOdds
  bookmakerOdds: BookmakerOdds[]
  marketHistory: MarketHistoryPoint[]
} {
  const defaultOdds: MatchOdds = { home: 0, draw: 0, away: 0, over25: 0, btts: 0 }
  const bookmakerOdds: BookmakerOdds[] = []

  if (!oddsFixture?.bookmakers?.length) {
    return { odds: defaultOdds, bookmakerOdds, marketHistory: [] }
  }

  for (const bm of oddsFixture.bookmakers) {
    const matchWinner = bm.bets.find((b) => b.name === "Match Winner")
    if (!matchWinner) continue

    const home = parseFloat(matchWinner.values.find((v) => v.value === "Home")?.odd ?? "0")
    const draw = parseFloat(matchWinner.values.find((v) => v.value === "Draw")?.odd ?? "0")
    const away = parseFloat(matchWinner.values.find((v) => v.value === "Away")?.odd ?? "0")

    bookmakerOdds.push({ bookmaker: bm.name, home, draw, away })
  }

  // Use first bookmaker as primary odds
  const primary = bookmakerOdds[0]
  let over25 = 0
  let btts = 0

  const firstBm = oddsFixture.bookmakers[0]
  if (firstBm) {
    const goals = firstBm.bets.find((b) => b.name === "Goals Over/Under")
    const over25Val = goals?.values.find((v) => v.value === "Over 2.5")
    if (over25Val) over25 = parseFloat(over25Val.odd)

    const bttsMarket = firstBm.bets.find((b) => b.name === "Both Teams Score")
    const bttsYes = bttsMarket?.values.find((v) => v.value === "Yes")
    if (bttsYes) btts = parseFloat(bttsYes.odd)
  }

  const odds: MatchOdds = {
    home: primary?.home ?? 0,
    draw: primary?.draw ?? 0,
    away: primary?.away ?? 0,
    over25,
    btts,
  }

  // Generate a minimal market history snapshot (API doesn't provide history on free tier)
  const marketHistory: MarketHistoryPoint[] = primary
    ? [{ ts: new Date().toISOString(), home: primary.home, draw: primary.draw, away: primary.away }]
    : []

  return { odds, bookmakerOdds, marketHistory }
}

function mapPrediction(pred: ApiPredictionFixture): MatchPrediction {
  const pct = pred.predictions.percent
  const homeP = parseFloat(pct.home.replace("%", "")) || 0
  const drawP = parseFloat(pct.draw.replace("%", "")) || 0
  const awayP = parseFloat(pct.away.replace("%", "")) || 0
  const confidence = Math.max(homeP, drawP, awayP)

  const homeGoals = parseFloat(pred.predictions.goals?.home ?? "1.3")
  const awayGoals = parseFloat(pred.predictions.goals?.away ?? "1.0")

  return {
    confidence: Math.round(confidence),
    advice: pred.predictions.advice ?? "",
    expectedGoals: {
      home: isNaN(homeGoals) ? 1.3 : homeGoals,
      away: isNaN(awayGoals) ? 1.0 : awayGoals,
    },
  }
}

function mapH2H(h2hFixtures: ApiFixture[]): H2HRecord[] {
  return h2hFixtures.slice(0, 5).map((f) => ({
    date: f.fixture.date.split("T")[0],
    home: f.teams.home.name,
    away: f.teams.away.name,
    score: { home: f.goals.home ?? 0, away: f.goals.away ?? 0 },
  }))
}

function mapPlayerRatings(fixture: ApiFixture): PlayerRatings | undefined {
  if (!fixture.players?.length) return undefined

  const mapTeam = (teamIndex: number): PlayerRating[] => {
    const team = fixture.players![teamIndex]
    if (!team) return []
    return team.players
      .filter((p) => p.statistics[0]?.games.minutes != null)
      .slice(0, 11)
      .map((p) => ({
        name: p.player.name,
        position: p.statistics[0]?.games.position ?? "MF",
        rating: parseFloat(p.statistics[0]?.games.rating ?? "0") || 0,
        goals: p.statistics[0]?.goals.total ?? undefined,
        assists: p.statistics[0]?.goals.assists ?? undefined,
      }))
  }

  return { home: mapTeam(0), away: mapTeam(1) }
}

/** Map a basic API fixture to our Match type (no odds/predictions — for feed) */
export function mapFixtureToMatch(fixture: ApiFixture): Match {
  const homeId = fixture.teams.home.id
  const status = mapStatus(fixture.fixture.status.short)

  const defaultOdds: MatchOdds = { home: 0, draw: 0, away: 0, over25: 0, btts: 0 }
  const defaultPrediction: MatchPrediction = {
    confidence: 50,
    advice: "No prediction available",
    expectedGoals: { home: 1.2, away: 1.0 },
  }

  return {
    id: fixture.fixture.id,
    league: fixture.league.name,
    country: fixture.league.country,
    venue: fixture.fixture.venue.name ?? "Unknown Venue",
    kickoffISO: fixture.fixture.date,
    status,
    minute: fixture.fixture.status.elapsed ?? undefined,
    home: {
      name: fixture.teams.home.name,
      short: fixture.teams.home.name.slice(0, 3).toUpperCase(),
      form: "",
    },
    away: {
      name: fixture.teams.away.name,
      short: fixture.teams.away.name.slice(0, 3).toUpperCase(),
      form: "",
    },
    score: {
      home: fixture.goals.home ?? 0,
      away: fixture.goals.away ?? 0,
    },
    odds: defaultOdds,
    marketHistory: [],
    bookmakerOdds: [],
    prediction: defaultPrediction,
    events: fixture.events ? mapEvents(fixture.events, homeId) : [],
    stats: fixture.statistics ? mapStats(fixture.statistics, homeId) : undefined,
    h2h: undefined,
    playerRatings: fixture.players ? mapPlayerRatings(fixture) : undefined,
  }
}

/** Enrich a match with odds data */
export function enrichWithOdds(
  match: Match,
  oddsFixture: ApiOddsFixture,
): Match {
  const { odds, bookmakerOdds, marketHistory } = mapOdds(oddsFixture)
  return { ...match, odds, bookmakerOdds, marketHistory }
}

/** Enrich a match with prediction data */
export function enrichWithPrediction(
  match: Match,
  predFixture: ApiPredictionFixture,
): Match {
  const prediction = mapPrediction(predFixture)
  const h2h = mapH2H(predFixture.h2h ?? [])
  return { ...match, prediction, h2h }
}
