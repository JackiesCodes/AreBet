"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils/cn"
import Link from "next/link"

type BetResult = "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID"

interface UserBet {
  id: string
  fixture_id: number
  market: string
  market_label?: string
  selection: string
  selection_label?: string
  match_label?: string
  stake: number
  odds: number
  result: BetResult
  bet_type?: string
  kickoff_iso?: string
  placed_at: string
}

type Tab = "open" | "settled"

const RESULT_LABELS: Record<BetResult, string> = {
  PENDING: "Open",
  WIN: "Won",
  LOSS: "Lost",
  PUSH: "Push",
  VOID: "Void",
}

const RESULT_COLORS: Record<BetResult, string> = {
  PENDING: "pending",
  WIN: "win",
  LOSS: "loss",
  PUSH: "push",
  VOID: "void",
}

export default function MyBetsPage() {
  const { user, loading: authLoading } = useAuth()
  const [bets, setBets] = useState<UserBet[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("open")

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchBets() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("user_bets")
        .select("*")
        .eq("user_id", user!.id)
        .order("placed_at", { ascending: false })

      if (!error && data) {
        setBets(data as UserBet[])
      }
      setLoading(false)
    }

    fetchBets()
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="my-bets-page">
        <div className="my-bets-loading">Loading your bets…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="my-bets-page">
        <div className="my-bets-empty">
          <h2>Sign in to view your bets</h2>
          <Link href="/auth/login" className="md-btn md-btn--primary">Sign In</Link>
        </div>
      </div>
    )
  }

  const openBets = bets.filter((b) => b.result === "PENDING")
  const settledBets = bets.filter((b) => b.result !== "PENDING")
  const displayBets = activeTab === "open" ? openBets : settledBets

  return (
    <div className="my-bets-page">
      <div className="my-bets-header">
        <h1 className="my-bets-title">My Bets</h1>
      </div>

      <div className="my-bets-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "open"}
          className={cn("my-bets-tab", activeTab === "open" && "my-bets-tab--active")}
          onClick={() => setActiveTab("open")}
        >
          Open
          {openBets.length > 0 && (
            <span className="my-bets-tab-badge">{openBets.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "settled"}
          className={cn("my-bets-tab", activeTab === "settled" && "my-bets-tab--active")}
          onClick={() => setActiveTab("settled")}
        >
          Settled
          {settledBets.length > 0 && (
            <span className="my-bets-tab-badge">{settledBets.length}</span>
          )}
        </button>
      </div>

      {displayBets.length === 0 ? (
        <div className="my-bets-empty">
          <p>{activeTab === "open" ? "No open bets" : "No settled bets yet"}</p>
          {activeTab === "open" && (
            <Link href="/" className="md-btn md-btn--primary">Browse Matches</Link>
          )}
        </div>
      ) : (
        <div className="bet-history-list">
          {displayBets.map((bet) => {
            const potentialReturn = bet.stake * bet.odds
            const date = new Date(bet.placed_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })

            return (
              <div key={bet.id} className="bet-history-item">
                <div className="bet-history-header">
                  <div className="bet-history-match">
                    {bet.match_label || `Fixture #${bet.fixture_id}`}
                  </div>
                  <span className={cn("bet-result-badge", `bet-result-badge--${RESULT_COLORS[bet.result as BetResult] || "pending"}`)}>
                    {RESULT_LABELS[bet.result as BetResult] || bet.result}
                  </span>
                </div>

                <div className="bet-history-details">
                  <div className="bet-history-market">
                    <span className="bet-history-label">Market</span>
                    <span>{bet.market_label || bet.market}</span>
                  </div>
                  <div className="bet-history-selection">
                    <span className="bet-history-label">Selection</span>
                    <span>{bet.selection_label || bet.selection}</span>
                  </div>
                  {bet.bet_type && (
                    <div className="bet-history-type">
                      <span className="bet-history-label">Type</span>
                      <span>{bet.bet_type}</span>
                    </div>
                  )}
                </div>

                <div className="bet-history-financials">
                  <div className="bet-history-financial-row">
                    <span>Stake</span>
                    <span>${bet.stake.toFixed(2)}</span>
                  </div>
                  <div className="bet-history-financial-row">
                    <span>Odds</span>
                    <span>{bet.odds.toFixed(2)}</span>
                  </div>
                  <div className="bet-history-financial-row bet-history-financial-row--return">
                    <span>{bet.result === "WIN" ? "Returns" : "Potential Return"}</span>
                    <span className={cn("bet-history-return", bet.result === "WIN" && "bet-history-return--win")}>
                      ${potentialReturn.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bet-history-date">{date}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
