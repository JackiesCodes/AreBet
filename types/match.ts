export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED"

export type Side = "home" | "away"

export interface TeamInfo {
  name: string
  short: string
  form: string // e.g. "WWLDW"
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
  xg: PairStat
  passAccuracy: PairStat
  corners: PairStat
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
  goals?: number
  assists?: number
}

export interface PlayerRatings {
  home: PlayerRating[]
  away: PlayerRating[]
}

export interface Match {
  id: number
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
}

export interface MatchFeed {
  matches: Match[]
  fetchedAt: string
  source: "demo" | "api"
}

export type ConfidenceTier = "low" | "mid" | "high"

export type SortKey = "confidence" | "kickoff" | "odds" | "league"

export type StatusFilter = "all" | "live" | "soon" | "favorites" | "high"
