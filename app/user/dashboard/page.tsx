"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { TierBadge } from "@/components/primitives/TierBadge"
import { Skeleton } from "@/components/primitives/Skeleton"
import { useBets } from "@/hooks/useBets"
import { BankrollTracker } from "@/components/features/BankrollTracker"
import { LogBetModal } from "@/components/features/LogBetModal"
import type { BetRecord } from "@/types/bet"

export default function UserDashboard() {
  const { user } = useAuth()
  const { bets, summary, loading, isLocal, logBet, settleLocalBet, deleteBet } = useBets()
  // isLocal replaces old isDemo — bets persist in localStorage when not signed in
  const [showModal, setShowModal] = useState(false)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const recent = bets.slice(0, 20)

  async function handleSettle(id: string, result: BetRecord["result"]) {
    setSettlingId(id)
    settleLocalBet(id, result)
    setSettlingId(null)
  }

  return (
    <div className="md-page">
      <PageHeader
        title="Your Dashboard"
        subtitle={user?.email ? `Signed in as ${user.email}` : "Tracking bets locally — sign in to sync across devices"}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TierBadge tier="free" />
            <button
              type="button"
              className="md-btn md-btn--primary md-btn--sm"
              onClick={() => setShowModal(true)}
            >
              + Log Bet
            </button>
          </div>
        }
      />

      {isLocal && (
        <div className="md-banner md-banner--info" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
          Bets are saved locally on this device.{" "}
          <a href="/auth/login" style={{ color: "var(--primary)", textDecoration: "underline" }}>Sign in</a>
          {" "}to sync across devices.
        </div>
      )}

      {loading ? (
        <Skeleton count={3} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
            <Card>
              <CardSubtitle>Total Bets</CardSubtitle>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.total}</div>
              <div className="md-text-muted" style={{ fontSize: 11 }}>{summary.pending} pending</div>
            </Card>
            <Card>
              <CardSubtitle>Win Rate</CardSubtitle>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.winRate.toFixed(1)}%</div>
              <div className="md-text-muted" style={{ fontSize: 11 }}>{summary.wins}W / {summary.losses}L</div>
            </Card>
            <Card>
              <CardSubtitle>ROI</CardSubtitle>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: summary.roi >= 0 ? "var(--positive)" : "var(--negative)",
              }}>
                {summary.roi >= 0 ? "+" : ""}{summary.roi.toFixed(1)}%
              </div>
            </Card>
            <Card>
              <CardSubtitle>Profit / Loss</CardSubtitle>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: summary.profit >= 0 ? "var(--positive)" : "var(--negative)",
              }}>
                {summary.profit >= 0 ? "+$" : "-$"}{Math.abs(summary.profit).toFixed(2)}
              </div>
            </Card>
          </div>

          <div style={{ marginBottom: 24 }}>
            <BankrollTracker />
          </div>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <CardTitle>Recent Bets</CardTitle>
              <button
                type="button"
                className="md-btn md-btn--ghost md-btn--sm"
                onClick={() => setShowModal(true)}
              >
                + Log Bet
              </button>
            </div>
            {recent.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <p className="md-text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  No bets yet. Start tracking your picks.
                </p>
                <button
                  type="button"
                  className="md-btn md-btn--primary md-btn--sm"
                  onClick={() => setShowModal(true)}
                >
                  Log your first bet
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="md-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Match</th>
                      <th>Market</th>
                      <th>Sel.</th>
                      <th>Stake</th>
                      <th>Odds</th>
                      <th>Return</th>
                      <th>Result</th>
                      {isLocal && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((b) => {
                      const ret = b.result === "WIN" ? b.stake * b.odds : b.result === "LOSS" ? 0 : null
                      return (
                        <tr key={b.id}>
                          <td className="md-mono">{b.created_at.slice(0, 10)}</td>
                          <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.teams}</td>
                          <td>{b.market}</td>
                          <td>{b.selection}</td>
                          <td className="md-mono">${b.stake.toFixed(2)}</td>
                          <td className="md-mono">{b.odds.toFixed(2)}</td>
                          <td className="md-mono">
                            {ret != null ? (
                              <span style={{ color: ret > 0 ? "var(--positive)" : "var(--negative)" }}>
                                ${ret.toFixed(2)}
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            {b.result === "PENDING" && isLocal ? (
                              <div style={{ display: "flex", gap: 4 }}>
                                {(["WIN", "LOSS", "PUSH"] as const).map((r) => (
                                  <button
                                    key={r}
                                    type="button"
                                    disabled={settlingId === b.id}
                                    className={`md-btn md-btn--sm ${r === "WIN" ? "md-btn--primary" : "md-btn--ghost"}`}
                                    style={{ padding: "2px 6px", fontSize: 10 }}
                                    onClick={() => handleSettle(b.id, r)}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className={
                                b.result === "WIN" ? "md-text-positive" :
                                b.result === "LOSS" ? "md-text-negative" :
                                b.result === "PENDING" ? "md-text-muted" : ""
                              }>
                                {b.result}
                              </span>
                            )}
                          </td>
                          {isLocal && (
                            <td>
                              <button
                                type="button"
                                className="md-btn md-btn--ghost md-btn--sm"
                                style={{ padding: "2px 6px", fontSize: 10, color: "var(--negative)" }}
                                onClick={() => deleteBet(b.id)}
                                aria-label="Delete bet"
                              >
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {showModal && (
        <LogBetModal
          onClose={() => setShowModal(false)}
          onSave={logBet}
        />
      )}
    </div>
  )
}
