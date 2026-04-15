"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { fetchUserBets, placeBet, calcBetSummary, calcDailyPerf, calcMarketEdge } from "@/lib/services/bets"
import type { BetRecord } from "@/types/bet"
import type { BetSlipItem } from "@/types/bet"

export function useBets() {
  const { user } = useAuth()
  const [bets, setBets] = useState<BetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) {
      // Not signed in — show empty state; sign in to track bets
      setBets([])
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

  useEffect(() => {
    void load()
  }, [load])

  const place = useCallback(
    async (items: BetSlipItem[], stake: number): Promise<void> => {
      if (!user) throw new Error("Sign in to place bets")
      const promises = items.map((item) =>
        placeBet(user.id, {
          matchId: item.matchId,
          teams: item.match,
          league: item.league,
          market: item.market,
          selection: item.selection,
          stake,
          odds: item.odds,
        }),
      )
      const placed = await Promise.all(promises)
      setBets((prev) => [...placed, ...prev])
    },
    [user],
  )

  const summary = calcBetSummary(bets)
  const dailyPerf = calcDailyPerf(bets)
  const marketEdge = calcMarketEdge(bets)

  return { bets, loading, error, place, summary, dailyPerf, marketEdge, isDemo: !user }
}
