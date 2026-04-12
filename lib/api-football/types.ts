// API-Football v3 response types (api-sports.io)
// Full suite — no endpoint restrictions

export interface ApiResponse<T> {
  get: string
  parameters: Record<string, string>
  errors: string[] | Record<string, string>
  results: number
  paging: { current: number; total: number }
  response: T[]
}

// --- Fixtures ---

export interface ApiFixtureStatus {
  long: string
  short: string
  elapsed: number | null
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
  lineups?: unknown[]
  players?: ApiFixturePlayers[]
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

export interface ApiFixturePlayers {
  team: { id: number; name: string; logo: string }
  players: Array<{
    player: { id: number; name: string; photo: string }
    statistics: Array<{
      games: { minutes: number | null; rating: string | null; position: string | null }
      goals: { total: number | null; assists: number | null }
    }>
  }>
}

// --- Odds ---

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

// --- Predictions ---

// --- Standings ---

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

// --- Injuries ---

export interface ApiInjury {
  player: { id: number; name: string; photo: string; type: string; reason: string }
  team: { id: number; name: string; logo: string }
  fixture: { id: number; timezone: string; date: string; timestamp: number }
}

// --- Head-to-head: same shape as ApiFixture[], reuse that type ---

// --- Top scorers / player statistics ---

export interface ApiPlayerStat {
  player: {
    id: number
    name: string
    nationality: string
    photo: string
  }
  statistics: Array<{
    team: { id: number; name: string; logo: string }
    league: { id: number; name: string; country: string; logo: string; season: number }
    games: { appearences: number | null; lineups: number | null; minutes: number | null; rating: string | null }
    goals: { total: number | null; assists: number | null; conceded: number | null; saves: number | null }
    shots: { total: number | null; on: number | null }
    passes: { total: number | null; key: number | null; accuracy: string | null }
  }>
}

// --- Transfers ---

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

// --- Sidelined ---

export interface ApiSidelined {
  player: { id: number; name: string; photo: string }
  sidelined: Array<{ type: string; start: string; end: string | null }>
}

// --- Predictions ---

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
