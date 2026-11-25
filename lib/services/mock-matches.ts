import { seededRandom, hashString } from "@/lib/utils/seeded-random"
import type { Match, MatchFeed, MatchOdds, MatchPrediction, TeamInfo } from "@/types/match"

// ---------------------------------------------------------------------------
// Seed-stable odds builder (mirrors lib/providers/odds/mock.ts)
// ---------------------------------------------------------------------------

const MARGIN = 1.06

function odds(p: number): number {
  return Math.round((1 / (p * MARGIN)) * 100) / 100
}

function oddsForFixture(id: number): MatchOdds {
  const rng = seededRandom(hashString(`odds:${id}`))
  const rh = 0.2 + rng() * 0.6
  const rd = 0.15 + rng() * 0.2
  const ra = 0.2 + rng() * 0.6
  const t = rh + rd + ra
  const ph = rh / t, pd = rd / t, pa = ra / t
  const o25 = 0.4 + rng() * 0.3
  const bttsYes = 0.35 + rng() * 0.3
  return {
    home: odds(ph),
    draw: odds(pd),
    away: odds(pa),
    over25: odds(o25),
    btts: odds(bttsYes),
    under25: odds(1 - o25),
    bttsNo: odds(1 - bttsYes),
    dcHomeOrDraw: odds(ph + pd),
    dcDrawOrAway: odds(pd + pa),
    dcHomeOrAway: odds(ph + pa),
  }
}

function predForFixture(id: number): MatchPrediction {
  const rng = seededRandom(hashString(`pred:${id}`))
  const c = 50 + Math.round(rng() * 40)
  const egH = +(0.8 + rng() * 1.4).toFixed(1)
  const egA = +(0.6 + rng() * 1.2).toFixed(1)
  const rh = 0.2 + rng() * 0.6
  const rd = 0.15 + rng() * 0.2
  const ra = 0.2 + rng() * 0.6
  const t = rh + rd + ra
  const advices = [
    "Home Win", "Draw", "Away Win",
    "Home or Draw", "Both Teams to Score",
    "Over 2.5 Goals", "Home Win to Nil",
  ]
  return {
    confidence: c,
    advice: advices[Math.floor(rng() * advices.length)],
    expectedGoals: { home: egH, away: egA },
    modelProbs: { home: rh / t, draw: rd / t, away: ra / t },
    hasRealPrediction: false,
  }
}

// ---------------------------------------------------------------------------
// Static fixture catalogue (IDs are stable, seeded odds are deterministic)
// ---------------------------------------------------------------------------

interface FixtureDef {
  id: number
  league: string
  leagueId: number
  country: string
  venue: string
  home: Omit<TeamInfo, "form">
  away: Omit<TeamInfo, "form">
  /** minutes from now for kickoff: negative = past, 0..89 = live minute */
  offsetMin: number
}

const FIXTURES: FixtureDef[] = [
  // ── Premier League ──────────────────────────────────────────────────────────
  { id: 1001, league: "Premier League", leagueId: 39, country: "England", venue: "Anfield",
    home: { name: "Liverpool", short: "LIV" }, away: { name: "Manchester City", short: "MCI" }, offsetMin: 25 },
  { id: 1002, league: "Premier League", leagueId: 39, country: "England", venue: "Old Trafford",
    home: { name: "Manchester Utd", short: "MAN" }, away: { name: "Arsenal", short: "ARS" }, offsetMin: 90 },
  { id: 1003, league: "Premier League", leagueId: 39, country: "England", venue: "Stamford Bridge",
    home: { name: "Chelsea", short: "CHE" }, away: { name: "Tottenham", short: "TOT" }, offsetMin: 150 },
  { id: 1004, league: "Premier League", leagueId: 39, country: "England", venue: "St. James' Park",
    home: { name: "Newcastle", short: "NEW" }, away: { name: "Aston Villa", short: "AVL" }, offsetMin: 240 },
  { id: 1005, league: "Premier League", leagueId: 39, country: "England", venue: "Goodison Park",
    home: { name: "Everton", short: "EVE" }, away: { name: "West Ham", short: "WHU" }, offsetMin: 1440 },

  // ── La Liga ─────────────────────────────────────────────────────────────────
  { id: 2001, league: "La Liga", leagueId: 140, country: "Spain", venue: "Santiago Bernabéu",
    home: { name: "Real Madrid", short: "RMA" }, away: { name: "FC Barcelona", short: "BAR" }, offsetMin: 60 },
  { id: 2002, league: "La Liga", leagueId: 140, country: "Spain", venue: "Ramón Sánchez-Pizjuán",
    home: { name: "Sevilla", short: "SEV" }, away: { name: "Atlético Madrid", short: "ATM" }, offsetMin: 180 },
  { id: 2003, league: "La Liga", leagueId: 140, country: "Spain", venue: "Estadio de Mestalla",
    home: { name: "Valencia", short: "VAL" }, away: { name: "Athletic Club", short: "ATH" }, offsetMin: 1500 },

  // ── Bundesliga ──────────────────────────────────────────────────────────────
  { id: 3001, league: "Bundesliga", leagueId: 78, country: "Germany", venue: "Allianz Arena",
    home: { name: "Bayern Munich", short: "BAY" }, away: { name: "Borussia Dortmund", short: "BVB" }, offsetMin: 45 },
  { id: 3002, league: "Bundesliga", leagueId: 78, country: "Germany", venue: "Red Bull Arena",
    home: { name: "RB Leipzig", short: "RBL" }, away: { name: "Bayer Leverkusen", short: "B04" }, offsetMin: 200 },
  { id: 3003, league: "Bundesliga", leagueId: 78, country: "Germany", venue: "Volkswagen Arena",
    home: { name: "VfL Wolfsburg", short: "WOB" }, away: { name: "Eintracht Frankfurt", short: "SGE" }, offsetMin: 1600 },

  // ── Serie A ─────────────────────────────────────────────────────────────────
  { id: 4001, league: "Serie A", leagueId: 135, country: "Italy", venue: "San Siro",
    home: { name: "AC Milan", short: "MIL" }, away: { name: "Juventus", short: "JUV" }, offsetMin: 72 },
  { id: 4002, league: "Serie A", leagueId: 135, country: "Italy", venue: "Stadio Diego Armando Maradona",
    home: { name: "Napoli", short: "NAP" }, away: { name: "Inter Milan", short: "INT" }, offsetMin: 300 },
  { id: 4003, league: "Serie A", leagueId: 135, country: "Italy", venue: "Stadio Olimpico",
    home: { name: "AS Roma", short: "ROM" }, away: { name: "Lazio", short: "LAZ" }, offsetMin: 1320 },

  // ── Ligue 1 ─────────────────────────────────────────────────────────────────
  { id: 5001, league: "Ligue 1", leagueId: 61, country: "France", venue: "Parc des Princes",
    home: { name: "PSG", short: "PSG" }, away: { name: "Olympique Marseille", short: "OM" }, offsetMin: 120 },
  { id: 5002, league: "Ligue 1", leagueId: 61, country: "France", venue: "Groupama Stadium",
    home: { name: "Lyon", short: "OL" }, away: { name: "Monaco", short: "MON" }, offsetMin: 2000 },

  // ── Champions League ────────────────────────────────────────────────────────
  { id: 6001, league: "Champions League", leagueId: 2, country: "Europe", venue: "Camp Nou",
    home: { name: "FC Barcelona", short: "BAR" }, away: { name: "Bayern Munich", short: "BAY" }, offsetMin: 2880 },
  { id: 6002, league: "Champions League", leagueId: 2, country: "Europe", venue: "Emirates Stadium",
    home: { name: "Arsenal", short: "ARS" }, away: { name: "Real Madrid", short: "RMA" }, offsetMin: 3000 },
  { id: 6003, league: "Champions League", leagueId: 2, country: "Europe", venue: "Allianz Arena",
    home: { name: "Bayern Munich", short: "BAY" }, away: { name: "Manchester City", short: "MCI" }, offsetMin: 4320 },
  { id: 6004, league: "Champions League", leagueId: 2, country: "Europe", venue: "Anfield",
    home: { name: "Liverpool", short: "LIV" }, away: { name: "PSG", short: "PSG" }, offsetMin: 4440 },

  // ── Europa League ───────────────────────────────────────────────────────────
  { id: 7001, league: "Europa League", leagueId: 3, country: "Europe", venue: "BayArena",
    home: { name: "Bayer Leverkusen", short: "B04" }, away: { name: "Sevilla", short: "SEV" }, offsetMin: 5760 },
  { id: 7002, league: "Europa League", leagueId: 3, country: "Europe", venue: "Parc des Princes",
    home: { name: "PSG", short: "PSG" }, away: { name: "Roma", short: "ROM" }, offsetMin: 5880 },

  // ── Finished matches (for history / settled bets) ───────────────────────────
  { id: 9001, league: "Premier League", leagueId: 39, country: "England", venue: "Etihad Stadium",
    home: { name: "Manchester City", short: "MCI" }, away: { name: "Chelsea", short: "CHE" }, offsetMin: -130 },
  { id: 9002, league: "La Liga", leagueId: 140, country: "Spain", venue: "Camp Nou",
    home: { name: "FC Barcelona", short: "BAR" }, away: { name: "Real Madrid", short: "RMA" }, offsetMin: -130 },
  { id: 9003, league: "Bundesliga", leagueId: 78, country: "Germany", venue: "Signal Iduna Park",
    home: { name: "Borussia Dortmund", short: "BVB" }, away: { name: "Bayern Munich", short: "BAY" }, offsetMin: -1500 },
]

// ---------------------------------------------------------------------------
// Forms (cycled by team hash)
// ---------------------------------------------------------------------------

const FORMS = ["WWWDL", "WDWLW", "LLLWW", "DWWWD", "WLLWW", "LWWDW", "WWLWD", "DWWLW"]

function formFor(name: string): string {
  const h = hashString(name) % FORMS.length
  return FORMS[h]
}

// ---------------------------------------------------------------------------
// Score for live/finished matches
// ---------------------------------------------------------------------------

function scoreFor(id: number, minute: number, finished: boolean) {
  const rng = seededRandom(hashString(`score:${id}`))
  const goals = Math.floor(rng() * (finished ? 5 : (minute / 90) * 4 + 1))
  const half = Math.floor(goals / 2)
  const other = goals - half
  const homeFirst = rng() > 0.5
  return {
    home: homeFirst ? Math.max(half, other) : half,
    away: homeFirst ? half : Math.max(half, other),
  }
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildMockMatchFeed(): MatchFeed {
  const now = Date.now()
  const matches: Match[] = FIXTURES.map((f): Match => {
    const kickoffMs = now + f.offsetMin * 60_000
    const kickoffISO = new Date(kickoffMs).toISOString()

    let status: Match["status"]
    let minute: number | undefined

    if (f.offsetMin < 0) {
      status = "FINISHED"
    } else if (f.offsetMin >= 0 && f.offsetMin < 90) {
      status = "LIVE"
      minute = f.offsetMin
    } else {
      status = "UPCOMING"
    }

    const scoreData =
      status === "LIVE"
        ? scoreFor(f.id, f.offsetMin, false)
        : status === "FINISHED"
          ? scoreFor(f.id, 90, true)
          : { home: 0, away: 0 }

    const matchOdds = oddsForFixture(f.id)
    const prediction = predForFixture(f.id)

    const homeTeam: TeamInfo = { ...f.home, form: formFor(f.home.name) }
    const awayTeam: TeamInfo = { ...f.away, form: formFor(f.away.name) }

    return {
      id: f.id,
      leagueId: f.leagueId,
      league: f.league,
      country: f.country,
      venue: f.venue,
      kickoffISO,
      status,
      minute,
      home: homeTeam,
      away: awayTeam,
      score: scoreData,
      odds: matchOdds,
      marketHistory: [],
      bookmakerOdds: [],
      prediction,
      events: [],
    }
  })

  return {
    matches,
    fetchedAt: new Date().toISOString(),
    source: "api",
  }
}
