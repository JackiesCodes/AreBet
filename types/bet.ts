export type Market = "1X2" | "BTTS" | "OVER25" | "UNDER25" | "DNB"

export type BetResult = "WIN" | "LOSS" | "PUSH" | "PENDING"

export type Selection = "HOME" | "DRAW" | "AWAY" | "YES" | "NO" | "OVER" | "UNDER"

export interface BetRecord {
  id: string
  user_id?: string
  matchId: number
  market: Market
  selection: Selection
  stake: number
  odds: number
  result: BetResult
  league?: string
  teams?: string
  created_at: string
}

export interface BetSlipItem {
  matchId: number
  match: string // e.g. "Arsenal vs Man City"
  market: Market
  selection: Selection
  odds: number
  league?: string
}
