import type {
  ApiFixture,
  ApiOddsFixture,
  ApiPredictionFixture,
  ApiEvent,
  ApiTeamStatistics,
  ApiInjury,
  ApiLineup,
  ApiCoach,
  ApiTrophy,
  ApiTransfer,
  ApiSidelined,
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
  MatchInjury,
  MatchLineup,
  TeamLineup,
  MatchCoach,
  MatchTrophy,
  MatchTransfer,
  MatchSidelined,
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

  const maybeZero = (h: number, a: number) =>
    h === 0 && a === 0 ? undefined : { h, a }

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
    shotsInsideBox: maybeZero(
      getStatValue(homeStats, "Shots insidebox"),
      getStatValue(awayStats, "Shots insidebox"),
    ),
    shotsOutsideBox: maybeZero(
      getStatValue(homeStats, "Shots outsidebox"),
      getStatValue(awayStats, "Shots outsidebox"),
    ),
    shotsBlocked: maybeZero(
      getStatValue(homeStats, "Blocked Shots"),
      getStatValue(awayStats, "Blocked Shots"),
    ),
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
    fouls: maybeZero(
      getStatValue(homeStats, "Fouls"),
      getStatValue(awayStats, "Fouls"),
    ),
    offsides: maybeZero(
      getStatValue(homeStats, "Offsides"),
      getStatValue(awayStats, "Offsides"),
    ),
    yellowCards: maybeZero(
      getStatValue(homeStats, "Yellow Cards"),
      getStatValue(awayStats, "Yellow Cards"),
    ),
    redCards: maybeZero(
      getStatValue(homeStats, "Red Cards"),
      getStatValue(awayStats, "Red Cards"),
    ),
  }
}

function parseOdd(val: string | undefined): number {
  if (!val) return 0
  const n = parseFloat(val)
  return isNaN(n) || n <= 1 ? 0 : n
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

    const home = parseOdd(matchWinner.values.find((v) => v.value === "Home")?.odd)
    const draw = parseOdd(matchWinner.values.find((v) => v.value === "Draw")?.odd)
    const away = parseOdd(matchWinner.values.find((v) => v.value === "Away")?.odd)

    bookmakerOdds.push({ bookmaker: bm.name, home, draw, away })
  }

  // Use first bookmaker for all extended markets
  const primary = bookmakerOdds[0]
  const firstBm = oddsFixture.bookmakers[0]

  let over25 = 0, btts = 0
  let over15 = 0, over35 = 0, under25 = 0, under35 = 0, bttsNo = 0
  let dcHomeOrDraw = 0, dcDrawOrAway = 0, dcHomeOrAway = 0
  let handicapHome = 0, handicapAway = 0

  if (firstBm) {
    // Goals Over/Under
    const goals = firstBm.bets.find((b) => b.name === "Goals Over/Under")
    if (goals) {
      over15 = parseOdd(goals.values.find((v) => v.value === "Over 1.5")?.odd)
      over25 = parseOdd(goals.values.find((v) => v.value === "Over 2.5")?.odd)
      over35 = parseOdd(goals.values.find((v) => v.value === "Over 3.5")?.odd)
      under25 = parseOdd(goals.values.find((v) => v.value === "Under 2.5")?.odd)
      under35 = parseOdd(goals.values.find((v) => v.value === "Under 3.5")?.odd)
    }

    // Both Teams Score
    const bttsMarket = firstBm.bets.find((b) => b.name === "Both Teams Score")
    if (bttsMarket) {
      btts = parseOdd(bttsMarket.values.find((v) => v.value === "Yes")?.odd)
      bttsNo = parseOdd(bttsMarket.values.find((v) => v.value === "No")?.odd)
    }

    // Double Chance
    const dcMarket = firstBm.bets.find((b) => b.name === "Double Chance")
    if (dcMarket) {
      dcHomeOrDraw = parseOdd(dcMarket.values.find((v) => v.value === "Home/Draw")?.odd)
      dcDrawOrAway = parseOdd(dcMarket.values.find((v) => v.value === "Draw/Away")?.odd)
      dcHomeOrAway = parseOdd(dcMarket.values.find((v) => v.value === "Home/Away")?.odd)
    }

    // Asian Handicap — look for Home -1 and Away +1
    const ahMarket = firstBm.bets.find((b) => b.name === "Asian Handicap")
    if (ahMarket) {
      handicapHome = parseOdd(ahMarket.values.find((v) => v.value === "Home -1")?.odd)
      handicapAway = parseOdd(ahMarket.values.find((v) => v.value === "Away +1")?.odd)
    }
  }

  const odds: MatchOdds = {
    home: primary?.home ?? 0,
    draw: primary?.draw ?? 0,
    away: primary?.away ?? 0,
    over25,
    btts,
    over15: over15 || undefined,
    over35: over35 || undefined,
    under25: under25 || undefined,
    under35: under35 || undefined,
    bttsNo: bttsNo || undefined,
    dcHomeOrDraw: dcHomeOrDraw || undefined,
    dcDrawOrAway: dcDrawOrAway || undefined,
    dcHomeOrAway: dcHomeOrAway || undefined,
    handicapHome: handicapHome || undefined,
    handicapAway: handicapAway || undefined,
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

  // Prefer prediction-specific goal estimates; fall back to last-5 scoring average
  // (much better than a hardcoded 1.2/1.0 default that is the same for every match)
  const last5Home = parseFloat(pred.teams?.home?.last_5?.goals?.for?.total?.average ?? "0") || 0
  const last5Away = parseFloat(pred.teams?.away?.last_5?.goals?.for?.total?.average ?? "0") || 0

  const rawHomeGoals = parseFloat(pred.predictions.goals?.home ?? "")
  const rawAwayGoals = parseFloat(pred.predictions.goals?.away ?? "")

  const homeGoals = !isNaN(rawHomeGoals) && rawHomeGoals > 0
    ? rawHomeGoals
    : last5Home > 0 ? last5Home : 1.3

  const awayGoals = !isNaN(rawAwayGoals) && rawAwayGoals > 0
    ? rawAwayGoals
    : last5Away > 0 ? last5Away : 1.0

  // Store all three probabilities for value bet calculation
  const total = homeP + drawP + awayP
  const modelProbs = total > 0
    ? { home: homeP / total, draw: drawP / total, away: awayP / total }
    : undefined

  return {
    confidence: Math.round(confidence),
    advice: pred.predictions.advice ?? "",
    expectedGoals: { home: homeGoals, away: awayGoals },
    modelProbs,
    hasRealPrediction: true,
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
      .filter((p) => (p.statistics[0]?.games.minutes ?? 0) > 0)
      .map((p) => {
        const s = p.statistics[0]
        const passAcc = s?.passes?.accuracy != null
          ? parseFloat(String(s.passes.accuracy).replace("%", "")) || undefined
          : undefined
        return {
          name: p.player.name,
          position: s?.games.position ?? "MF",
          rating: parseFloat(s?.games.rating ?? "0") || 0,
          minutes: s?.games.minutes ?? undefined,
          substitute: s?.games.substitute ?? undefined,
          goals: s?.goals.total ?? undefined,
          assists: s?.goals.assists ?? undefined,
          shots: s?.shots?.total ?? undefined,
          keyPasses: s?.passes?.key ?? undefined,
          passAccuracy: passAcc,
          tackles: s?.tackles?.total ?? undefined,
          interceptions: s?.tackles?.interceptions ?? undefined,
          dribblesSuccess: s?.dribbles?.success ?? undefined,
          dribblesAttempted: s?.dribbles?.attempts ?? undefined,
          foulsCommitted: s?.fouls?.committed ?? undefined,
          yellowCards: s?.cards?.yellow ?? undefined,
          redCards: s?.cards?.red ?? undefined,
        }
      })
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
    hasRealPrediction: false,
  }

  return {
    id: fixture.fixture.id,
    leagueId: fixture.league.id,
    league: fixture.league.name,
    country: fixture.league.country,
    venue: fixture.fixture.venue.name ?? "Unknown Venue",
    kickoffISO: fixture.fixture.date,
    status,
    minute: fixture.fixture.status.elapsed ?? undefined,
    home: {
      id: fixture.teams.home.id,
      name: fixture.teams.home.name,
      short: fixture.teams.home.name.slice(0, 3).toUpperCase(),
      form: "",
      logo: fixture.teams.home.logo || undefined,
    },
    away: {
      id: fixture.teams.away.id,
      name: fixture.teams.away.name,
      short: fixture.teams.away.name.slice(0, 3).toUpperCase(),
      form: "",
      logo: fixture.teams.away.logo || undefined,
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

/** Enrich a match with H2H fixtures (from dedicated endpoint) */
export function enrichWithH2H(match: Match, h2hFixtures: ApiFixture[]): Match {
  const h2h = mapH2H(h2hFixtures)
  return { ...match, h2h }
}

/** Map injury API response to typed MatchInjury[], keyed by home/away team id */
export function mapInjuries(
  injuries: ApiInjury[],
  homeTeamId: number,
): MatchInjury[] {
  return injuries.map((inj) => ({
    playerName: inj.player.name,
    type: inj.player.type,
    reason: inj.player.reason,
    team: inj.team.id === homeTeamId ? "home" : "away",
  }))
}

/** Enrich a match with injury data */
export function enrichWithInjuries(
  match: Match,
  injuries: ApiInjury[],
  homeTeamId: number,
): Match {
  return { ...match, injuries: mapInjuries(injuries, homeTeamId) }
}

// ── Lineup ────────────────────────────────────────────────────────────────────

function mapTeamLineup(raw: ApiLineup): TeamLineup {
  return {
    formation: raw.formation ?? "",
    startXI: (raw.startXI ?? []).map((p) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      position: p.player.pos,
      grid: p.player.grid,
    })),
    substitutes: (raw.substitutes ?? []).map((p) => ({
      id: p.player.id,
      name: p.player.name,
      number: p.player.number,
      position: p.player.pos,
      grid: p.player.grid,
    })),
    coach: raw.coach?.name ?? null,
    coachPhoto: raw.coach?.photo ?? null,
  }
}

export function mapLineups(lineups: ApiLineup[]): MatchLineup | undefined {
  if (lineups.length < 2) return undefined
  return {
    home: mapTeamLineup(lineups[0]),
    away: mapTeamLineup(lineups[1]),
  }
}

export function enrichWithLineup(match: Match, lineups: ApiLineup[]): Match {
  const lineup = mapLineups(lineups)
  return lineup ? { ...match, lineup } : match
}

// ── Coach ─────────────────────────────────────────────────────────────────────

export function mapCoach(raw: ApiCoach): MatchCoach {
  return {
    id: raw.id,
    name: raw.name,
    photo: raw.photo,
    nationality: raw.nationality ?? null,
    age: raw.age ?? null,
    career: (raw.career ?? []).map((c) => ({
      teamName: c.team.name,
      teamLogo: c.team.logo,
      start: c.start,
      end: c.end ?? null,
    })),
  }
}

export function enrichWithCoaches(
  match: Match,
  homeCoach: ApiCoach | null,
  awayCoach: ApiCoach | null,
): Match {
  if (!homeCoach && !awayCoach) return match
  return {
    ...match,
    coaches: {
      home: homeCoach ? mapCoach(homeCoach) : undefined,
      away: awayCoach ? mapCoach(awayCoach) : undefined,
    },
  }
}

// ── Trophies ──────────────────────────────────────────────────────────────────

export function mapTrophies(raw: ApiTrophy[]): MatchTrophy[] {
  return raw.map((t) => ({
    league: t.league,
    country: t.country,
    season: t.season,
    place: t.place,
  }))
}

export function enrichWithTrophies(
  match: Match,
  homeTrophies: ApiTrophy[],
  awayTrophies: ApiTrophy[],
): Match {
  return {
    ...match,
    trophies: {
      home: mapTrophies(homeTrophies),
      away: mapTrophies(awayTrophies),
    },
  }
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export function mapTransfers(raw: ApiTransfer[]): MatchTransfer[] {
  const result: MatchTransfer[] = []
  for (const t of raw) {
    for (const move of (t.transfers ?? []).slice(0, 5)) {
      result.push({
        playerName: t.player.name,
        date: move.date,
        type: move.type,
        teamIn: move.teams.in.name,
        teamInLogo: move.teams.in.logo,
        teamOut: move.teams.out.name,
        teamOutLogo: move.teams.out.logo,
      })
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
}

export function enrichWithTransfers(
  match: Match,
  homeTransfers: ApiTransfer[],
  awayTransfers: ApiTransfer[],
): Match {
  return {
    ...match,
    transfers: {
      home: mapTransfers(homeTransfers),
      away: mapTransfers(awayTransfers),
    },
  }
}

// ── Sidelined ─────────────────────────────────────────────────────────────────

export function mapSidelined(raw: ApiSidelined[]): MatchSidelined[] {
  const result: MatchSidelined[] = []
  for (const s of raw) {
    for (const entry of (s.sidelined ?? [])) {
      result.push({
        playerName: s.player.name,
        playerPhoto: s.player.photo,
        type: entry.type,
        start: entry.start,
        end: entry.end ?? null,
      })
    }
  }
  return result
}

export function enrichWithSidelined(
  match: Match,
  homeSidelined: ApiSidelined[],
  awaySidelined: ApiSidelined[],
): Match {
  return {
    ...match,
    sidelined: {
      home: mapSidelined(homeSidelined),
      away: mapSidelined(awaySidelined),
    },
  }
}
