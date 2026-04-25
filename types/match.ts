export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED"

export type Side = "home" | "away"

export interface TeamInfo {
  id?: number    // API-Football team id
  name: string
  short: string
  form: string // e.g. "WWLDW"
  logo?: string  // URL from API-Football teams endpoint
}

export interface Score {
  home: number
  away: number
}

export interface MatchOdds {
  home: number
  draw: number
  away: number
  over25: number
  btts: number
  // Extended markets (0 = not available)
  over15?: number
  over35?: number
  under25?: number
  under35?: number
  bttsNo?: number
  dcHomeOrDraw?: number   // Double chance 1X
  dcDrawOrAway?: number   // Double chance X2
  dcHomeOrAway?: number   // Double chance 12
  handicapHome?: number   // Asian handicap Home -1
  handicapAway?: number   // Asian handicap Away +1
}

export interface MarketHistoryPoint {
  ts: string
  home: number
  draw: number
  away: number
}

export interface BookmakerOdds {
  bookmaker: string
  home: number
  draw: number
  away: number
}

export interface ModelProbabilities {
  home: number // 0-1
  draw: number // 0-1
  away: number // 0-1
}

export interface PredictionFactor {
  label: string
  impact: "positive" | "negative" | "neutral"
  detail: string
  side: "home" | "away" | "both"
}

export interface ValueEdge {
  selection: "home" | "draw" | "away"
  modelProb: number    // 0-1
  impliedProb: number  // 0-1 fair (margin removed)
  edge: number         // percentage points, positive = value
  isValue: boolean     // edge >= VALUE_THRESHOLD (5%)
  odds: number         // the odds for this selection
}

export interface MatchPrediction {
  confidence: number // 0..100
  advice: string
  expectedGoals: { home: number; away: number }
  modelProbs?: ModelProbabilities
  valueEdge?: ValueEdge
  factors?: PredictionFactor[]
  /** True when prediction data came from the API, false when using defaults */
  hasRealPrediction?: boolean
}

export type MatchEventType = "goal" | "card" | "sub"

export interface MatchEvent {
  minute: number
  team: Side
  type: MatchEventType
  player: string
  detail: string
}

export interface PairStat {
  h: number
  a: number
}

export interface MatchStats {
  possession: PairStat
  shots: PairStat
  shotsOnTarget: PairStat
  shotsInsideBox?: PairStat
  shotsOutsideBox?: PairStat
  shotsBlocked?: PairStat
  xg: PairStat
  passAccuracy: PairStat
  corners: PairStat
  fouls?: PairStat
  offsides?: PairStat
  yellowCards?: PairStat
  redCards?: PairStat
}

export interface H2HRecord {
  date: string
  home: string
  away: string
  score: Score
}

export interface PlayerRating {
  name: string
  position: string
  rating: number
  minutes?: number
  goals?: number
  assists?: number
  shots?: number
  keyPasses?: number
  passAccuracy?: number
  tackles?: number
  interceptions?: number
  dribblesSuccess?: number
  dribblesAttempted?: number
  foulsCommitted?: number
  yellowCards?: number
  redCards?: number
  substitute?: boolean
}

export interface PlayerRatings {
  home: PlayerRating[]
  away: PlayerRating[]
}

export interface MatchInjury {
  playerName: string
  type: string    // "Missing Fixture" | "Questionable"
  reason: string
  team: "home" | "away"
}

// ── Lineup ────────────────────────────────────────────────────────────────────

export interface LineupPlayer {
  id: number
  name: string
  number: number
  position: string  // "G" | "D" | "M" | "F"
  grid: string | null  // "row:col" on the pitch e.g. "1:1"
}

export interface TeamLineup {
  formation: string        // e.g. "4-3-3"
  startXI: LineupPlayer[]
  substitutes: LineupPlayer[]
  coach: string | null
  coachPhoto: string | null
}

export interface MatchLineup {
  home: TeamLineup
  away: TeamLineup
}

// ── Coach ─────────────────────────────────────────────────────────────────────

export interface MatchCoach {
  id: number
  name: string
  photo: string
  nationality: string | null
  age: number | null
  career: Array<{
    teamName: string
    teamLogo: string
    start: string
    end: string | null
  }>
}

// ── Trophies ──────────────────────────────────────────────────────────────────

export interface MatchTrophy {
  league: string
  country: string
  season: string
  place: string  // "Winner" | "Runner-up"
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export interface MatchTransfer {
  playerName: string
  date: string
  type: string   // "Free" | "Loan" | transfer fee
  teamIn: string
  teamInLogo: string
  teamOut: string
  teamOutLogo: string
}

// ── Sidelined ─────────────────────────────────────────────────────────────────

export interface MatchSidelined {
  playerName: string
  playerPhoto: string
  type: string
  start: string
  end: string | null
}

// ── Main Match type ───────────────────────────────────────────────────────────

export interface Match {
  id: number
  leagueId?: number
  league: string
  country: string
  venue: string
  kickoffISO: string
  status: MatchStatus
  minute?: number
  home: TeamInfo
  away: TeamInfo
  score: Score
  odds: MatchOdds
  marketHistory: MarketHistoryPoint[]
  bookmakerOdds: BookmakerOdds[]
  prediction: MatchPrediction
  events: MatchEvent[]
  stats?: MatchStats
  h2h?: H2HRecord[]
  playerRatings?: PlayerRatings
  injuries?: MatchInjury[]
  lineup?: MatchLineup
  coaches?: { home?: MatchCoach; away?: MatchCoach }
  trophies?: { home?: MatchTrophy[]; away?: MatchTrophy[] }
  transfers?: { home?: MatchTransfer[]; away?: MatchTransfer[] }
  sidelined?: { home?: MatchSidelined[]; away?: MatchSidelined[] }
}

export interface MatchFeed {
  matches: Match[]
  fetchedAt: string
  source: "api"
}

export type ConfidenceTier = "low" | "mid" | "high"

export type SortKey = "confidence" | "kickoff" | "odds" | "league"

export type StatusFilter = "all" | "live" | "soon" | "favorites" | "high"
