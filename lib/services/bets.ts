import { createClient } from "@/lib/supabase/client"
import type { BetRecord } from "@/types/bet"

export interface BetSummary {
  total: number
  wins: number
  losses: number
  pending: number
  winRate: number   // 0-100
  roi: number       // percentage
  profit: number    // absolute P&L
  totalStaked: number
}

function getSupabase() {
  return createClient()
}

/** Place a bet — saves to Supabase and returns the created record */
export async function placeBet(
  userId: string,
  bet: Omit<BetRecord, "id" | "result" | "created_at">,
): Promise<BetRecord> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("user_bets")
    .insert({
      user_id: userId,
      fixture_id: bet.matchId,
      teams: bet.teams ?? "",
      league: bet.league ?? null,
      market: bet.market,
      selection: bet.selection,
      stake: bet.stake,
      odds: bet.odds,
      result: "PENDING",
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to place bet: ${error.message}`)

  return {
    id: data.id,
    user_id: data.user_id,
    matchId: data.fixture_id,
    teams: data.teams,
    league: data.league,
    market: data.market,
    selection: data.selection,
    stake: parseFloat(data.stake),
    odds: parseFloat(data.odds),
    result: data.result,
    created_at: data.placed_at,
  }
}

/** Fetch all bets for a user, newest first */
export async function fetchUserBets(userId: string): Promise<BetRecord[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("user_bets")
    .select("*")
    .eq("user_id", userId)
    .order("placed_at", { ascending: false })

  if (error) throw new Error(`Failed to fetch bets: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    matchId: row.fixture_id,
    teams: row.teams,
    league: row.league ?? undefined,
    market: row.market,
    selection: row.selection,
    stake: parseFloat(row.stake),
    odds: parseFloat(row.odds),
    result: row.result,
    created_at: row.placed_at,
  }))
}

/** Calculate summary stats from a list of bets */
export function calcBetSummary(bets: BetRecord[]): BetSummary {
  const settled = bets.filter((b) => b.result === "WIN" || b.result === "LOSS")
  const wins = bets.filter((b) => b.result === "WIN").length
  const losses = bets.filter((b) => b.result === "LOSS").length
  const pending = bets.filter((b) => b.result === "PENDING").length

  const totalStaked = settled.reduce((acc, b) => acc + b.stake, 0)
  const profit = settled.reduce((acc, b) => {
    if (b.result === "WIN") return acc + b.stake * b.odds - b.stake
    if (b.result === "LOSS") return acc - b.stake
    return acc
  }, 0)

  return {
    total: bets.length,
    wins,
    losses,
    pending,
    winRate: settled.length > 0 ? (wins / settled.length) * 100 : 0,
    roi: totalStaked > 0 ? (profit / totalStaked) * 100 : 0,
    profit,
    totalStaked,
  }
}

/** Build daily performance data for the chart */
export function calcDailyPerf(bets: BetRecord[]) {
  const byDay = new Map<string, { roi: number; winRate: number; count: number; wins: number; profit: number }>()

  for (const b of bets) {
    if (b.result !== "WIN" && b.result !== "LOSS") continue
    const day = b.created_at.slice(0, 10)
    const prev = byDay.get(day) ?? { roi: 0, winRate: 0, count: 0, wins: 0, profit: 0 }
    const betProfit = b.result === "WIN" ? b.stake * b.odds - b.stake : -b.stake
    prev.count += 1
    prev.wins += b.result === "WIN" ? 1 : 0
    prev.profit += betProfit
    prev.roi = (prev.profit / (prev.count * b.stake)) * 100
    prev.winRate = (prev.wins / prev.count) * 100
    byDay.set(day, prev)
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      roi: Math.round(v.roi),
      winRate: Math.round(v.winRate),
      profit: Math.round(v.profit * 100) / 100,
    }))
}

/** Build market edge breakdown */
export function calcMarketEdge(bets: BetRecord[]) {
  const byMarket = new Map<string, { profit: number; staked: number }>()

  for (const b of bets) {
    if (b.result !== "WIN" && b.result !== "LOSS") continue
    const prev = byMarket.get(b.market) ?? { profit: 0, staked: 0 }
    const betProfit = b.result === "WIN" ? b.stake * b.odds - b.stake : -b.stake
    prev.profit += betProfit
    prev.staked += b.stake
    byMarket.set(b.market, prev)
  }

  return Array.from(byMarket.entries()).map(([market, v]) => ({
    market,
    edge: v.staked > 0 ? Math.round((v.profit / v.staked) * 1000) / 10 : 0,
  }))
}
