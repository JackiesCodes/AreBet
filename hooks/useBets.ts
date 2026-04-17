"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { fetchUserBets, placeBet, calcBetSummary, calcDailyPerf, calcMarketEdge } from "@/lib/services/bets"
import type { BetRecord } from "@/types/bet"
import type { BetSlipItem } from "@/types/bet"

const LOCAL_KEY = "arebet:bets:v1"

function loadLocal(): BetRecord[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as BetRecord[]
  } catch { return [] }
}

function saveLocal(bets: BetRecord[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(bets)) } catch { /* ignore */ }
}

function makeLocalBet(
  partial: Omit<BetRecord, "id" | "user_id" | "created_at">,
): BetRecord {
  return {
    ...partial,
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  }
}

export function useBets() {
  const { user } = useAuth()
  const [bets, setBets] = useState<BetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      // Not signed in — use localStorage so bet tracking works without auth
      setBets(loadLocal())
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await fetchUserBets(user.id)
      setBets(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bets")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  /** Log a manual bet. Works with or without auth. */
  const logBet = useCallback(
    async (
      partial: Omit<BetRecord, "id" | "user_id" | "created_at">,
    ): Promise<void> => {
      if (user) {
        const placed = await placeBet(user.id, {
          matchId: partial.matchId,
          teams: partial.teams,
          league: partial.league,
          market: partial.market,
          selection: partial.selection,
          stake: partial.stake,
          odds: partial.odds,
        })
        setBets((prev) => [placed, ...prev])
      } else {
        const bet = makeLocalBet(partial)
        setBets((prev) => {
          const next = [bet, ...prev]
          saveLocal(next)
          return next
        })
      }
    },
    [user],
  )

  /** Update result of a bet (WIN/LOSS/PUSH). Local only for non-auth users. */
  const settleLocalBet = useCallback((id: string, result: BetRecord["result"]) => {
    setBets((prev) => {
      const next = prev.map((b) => b.id === id ? { ...b, result } : b)
      if (!user) saveLocal(next)
      return next
    })
  }, [user])

  /** Delete a bet (local only). */
  const deleteBet = useCallback((id: string) => {
    setBets((prev) => {
      const next = prev.filter((b) => b.id !== id)
      if (!user) saveLocal(next)
      return next
    })
  }, [user])

  /** Keep backwards-compat: place() for BetSlipItem array */
  const place = useCallback(
    async (items: BetSlipItem[], stake: number): Promise<void> => {
      for (const item of items) {
        await logBet({
          matchId: item.matchId,
          teams: item.match,
          league: item.league,
          market: item.market,
          selection: item.selection,
          stake,
          odds: item.odds,
          result: "PENDING",
        })
      }
    },
    [logBet],
  )

  const summary = calcBetSummary(bets)
  const dailyPerf = calcDailyPerf(bets)
  const marketEdge = calcMarketEdge(bets)

  return {
    bets, loading, error,
    logBet, settleLocalBet, deleteBet, place,
    summary, dailyPerf, marketEdge,
    isLocal: !user,
  }
}
