// API-Football v3 response types (api-sports.io)
// Full Pro-tier suite — all endpoints covered

export interface ApiResponse<T> {
  get: string
  parameters: Record<string, string>
  errors: string[] | Record<string, string>
  results: number
  paging: { current: number; total: number }
  response: T[]
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export interface ApiFixtureStatus {
  long: string
  short: string
  elapsed: number | null
}

export interface ApiEvent {
  time: { elapsed: number; extra: number | null }
  team: { id: number; name: string; logo: string }
  player: { id: number; name: string }
  assist: { id: number | null; name: string | null }
  type: string // "Goal" | "Card" | "subst" | "Var"
  detail: string
  comments: string | null
}

export interface ApiTeamStatistics {
  team: { id: number; name: string; logo: string }
  statistics: Array<{ type: string; value: string | number | null }>
}

export interface ApiLineupPlayer {
  player: {
    id: number
    name: string
    number: number
    pos: string   // "G" | "D" | "M" | "F"
    grid: string | null  // e.g. "1:1" — row:col on pitch
  }
}

export interface ApiLineup {
  team: {
    id: number
    name: string
    logo: string
    colors?: {
      player?: { primary?: string; number?: string; border?: string }
      goalkeeper?: { primary?: string; number?: string; border?: string }
    }
  }
  coach: { id: number | null; name: string | null; photo: string | null }
  formation: string   // e.g. "4-3-3"
  startXI: ApiLineupPlayer[]
  substitutes: ApiLineupPlayer[]
}

export interface ApiFixturePlayers {
  team: { id: number; name: string; logo: string }
  players: Array<{
    player: { id: number; name: string; photo: string }
    statistics: Array<{
      games: {
        minutes: number | null
        rating: string | null
        position: string | null
        substitute: boolean | null
      }
      goals: { total: number | null; assists: number | null }
      shots: { total: number | null; on: number | null } | null
      passes: { total: number | null; key: number | null; accuracy: string | null } | null
      tackles: { total: number | null; interceptions: number | null } | null
      dribbles: { attempts: number | null; success: number | null } | null
      fouls: { committed: number | null; drawn: number | null } | null
      cards: { yellow: number | null; red: number | null } | null
    }>
  }>
}

export interface ApiFixture {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    status: ApiFixtureStatus
    venue: { id: number | null; name: string | null; city: string | null }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
    season: number
    round: string
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty: { home: number | null; away: number | null }
  }
  events?: ApiEvent[]
  statistics?: ApiTeamStatistics[]
  lineups?: ApiLineup[]
  players?: ApiFixturePlayers[]
}

// ── Odds ─────────────────────────────────────────────────────────────────────

export interface ApiOddsFixture {
  fixture: { id: number; timezone: string; date: string; timestamp: number }
  league: { id: number; name: string; country: string; logo: string; flag: string | null; season: number }
  bookmakers: Array<{
    id: number
    name: string
    bets: Array<{
      id: number
      name: string
      values: Array<{ value: string; odd: string }>
    }>
  }>
}

// ── Predictions ───────────────────────────────────────────────────────────────

export interface ApiPredictionFixture {
  predictions: {
    winner: { id: number | null; name: string | null; comment: string | null } | null
    win_or_draw: boolean
    under_over: string | null
    goals: { home: string | null; away: string | null }
    advice: string
    percent: { home: string; draw: string; away: string }
  }
  comparison: Record<string, { home: string; away: string }>
  h2h: ApiFixture[]
  teams: {
    home: { id: number; name: string; last_5: { wins: number; draws: number; loses: number; goals: { for: { total: { average: string } }; against: { total: { average: string } } } } }
    away: { id: number; name: string; last_5: { wins: number; draws: number; loses: number; goals: { for: { total: { average: string } }; against: { total: { average: string } } } } }
  }
  league: { id: number; name: string; country: string; logo: string; flag: string | null; season: number }
}

// ── Standings ─────────────────────────────────────────────────────────────────

export interface ApiStandingRow {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  form: string
  status: string
  description: string | null
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
  home: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
  away: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
}

export interface ApiStandingResponse {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string | null
    season: number
    standings: ApiStandingRow[][]
  }
}

// ── Injuries ──────────────────────────────────────────────────────────────────

export interface ApiInjury {
  player: { id: number; name: string; photo: string; type: string; reason: string }
  team: { id: number; name: string; logo: string }
  fixture: { id: number; timezone: string; date: string; timestamp: number }
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export interface ApiTeam {
  team: {
    id: number
    name: string
    code: string | null
    country: string
    founded: number | null
    national: boolean
    logo: string
  }
  venue: {
    id: number | null
    name: string | null
    address: string | null
    city: string | null
    capacity: number | null
    surface: string | null
    image: string | null
  }
}

// ── Coach ─────────────────────────────────────────────────────────────────────

export interface ApiCoach {
  id: number
  name: string
  firstname: string | null
  lastname: string | null
  age: number | null
  birth: { date: string | null; place: string | null; country: string | null }
  nationality: string | null
  photo: string
  team: { id: number; name: string; logo: string }
  career: Array<{
    team: { id: number; name: string; logo: string }
    start: string
    end: string | null
  }>
}

// ── Trophies ──────────────────────────────────────────────────────────────────

export interface ApiTrophy {
  league: string
  country: string
  season: string
  place: string  // "Winner" | "Runner-up"
}

// ── Players ───────────────────────────────────────────────────────────────────

export interface ApiPlayerStat {
  player: {
    id: number
    name: string
    firstname?: string
    lastname?: string
    age?: number | null
    nationality?: string | null
    photo: string
    height?: string | null
    weight?: string | null
    birth?: { date: string | null; place: string | null; country: string | null }
  }
  statistics: Array<{
    team: { id: number; name: string; logo: string }
    league: { id: number; name: string; country: string; logo: string; season: number }
    games: {
      appearences: number | null
      lineups: number | null
      minutes: number | null
      rating: string | null
      captain: boolean | null
      substitute: boolean | null
      position: string | null
    }
    offsides: number | null
    shots: { total: number | null; on: number | null }
    goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null }
    passes: { total: number | null; key: number | null; accuracy: string | null }
    tackles: { total: number | null; blocks: number | null; interceptions: number | null } | null
    duels: { total: number | null; won: number | null } | null
    dribbles: { attempts: number | null; success: number | null; past: number | null } | null
    fouls: { drawn: number | null; committed: number | null } | null
    cards: { yellow: number | null; yellowred: number | null; red: number | null } | null
    penalty: { won: number | null; commited: number | null; scored: number | null; missed: number | null; saved: number | null } | null
  }>
}

// ── Team Season Statistics ────────────────────────────────────────────────────

export interface ApiTeamSeasonStats {
  league: { id: number; name: string; country: string; logo: string; flag: string | null; season: number }
  team: { id: number; name: string; logo: string }
  form: string
  fixtures: {
    played: { home: number; away: number; total: number }
    wins: { home: number; away: number; total: number }
    draws: { home: number; away: number; total: number }
    loses: { home: number; away: number; total: number }
  }
  goals: {
    for: {
      total: { home: number; away: number; total: number }
      average: { home: string; away: string; total: string }
    }
    against: {
      total: { home: number; away: number; total: number }
      average: { home: string; away: string; total: string }
    }
  }
  biggest: {
    streak: { wins: number; draws: number; loses: number }
    wins: { home: string | null; away: string | null }
    loses: { home: string | null; away: string | null }
    goals: { for: { home: number; away: number }; against: { home: number; away: number } }
  }
  clean_sheet: { home: number; away: number; total: number }
  failed_to_score: { home: number; away: number; total: number }
  penalty: {
    scored: { total: number; percentage: string }
    missed: { total: number; percentage: string }
    total: number
  }
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export interface ApiTransfer {
  player: { id: number; name: string }
  update: string
  transfers: Array<{
    date: string
    type: string
    teams: {
      in: { id: number; name: string; logo: string }
      out: { id: number; name: string; logo: string }
    }
  }>
}

// ── Sidelined ─────────────────────────────────────────────────────────────────

export interface ApiSidelined {
  player: { id: number; name: string; photo: string }
  sidelined: Array<{ type: string; start: string; end: string | null }>
}

// ── Leagues ───────────────────────────────────────────────────────────────────

export interface ApiLeague {
  league: {
    id: number
    name: string
    type: string
    logo: string
  }
  country: {
    name: string
    code: string | null
    flag: string | null
  }
  seasons: Array<{
    year: number
    start: string
    end: string
    current: boolean
    coverage: Record<string, unknown>
  }>
}

// ── Countries ─────────────────────────────────────────────────────────────────

export interface ApiCountry {
  name: string
  code: string | null
  flag: string | null
}

// ── Venues ────────────────────────────────────────────────────────────────────

export interface ApiVenueResult {
  id: number
  name: string
  address: string | null
  city: string | null
  country: string | null
  capacity: number | null
  surface: string | null
  image: string | null
}
