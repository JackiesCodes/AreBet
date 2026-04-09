"use client"

import { useAuth } from "@/lib/auth/context"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { TierBadge } from "@/components/primitives/TierBadge"
import { Skeleton } from "@/components/primitives/Skeleton"
import { useBets } from "@/hooks/useBets"
import { BankrollTracker } from "@/components/features/BankrollTracker"

export default function UserDashboard() {
  const { user } = useAuth()
  const { bets, summary, loading, isDemo } = useBets()
  const recent = bets.slice(0, 10)

  return (
    <div className="md-page">
      <PageHeader
        title="Your Dashboard"
        subtitle={user?.email ? `Signed in as ${user.email}` : "Sign in to track your bets"}
        actions={<TierBadge tier="free" />}
      />

      {isDemo && (
        <div className="md-banner md-banner--info" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
          Showing demo data. Sign in and place bets to see your real history.
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
                color: summary.roi >= 0 ? "var(--md-positive)" : "var(--md-negative)",
              }}>
                {summary.roi >= 0 ? "+" : ""}{summary.roi.toFixed(1)}%
              </div>
            </Card>
            <Card>
              <CardSubtitle>Profit / Loss</CardSubtitle>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: summary.profit >= 0 ? "var(--md-positive)" : "var(--md-negative)",
              }}>
                {summary.profit >= 0 ? "+$" : "-$"}{Math.abs(summary.profit).toFixed(2)}
              </div>
            </Card>
          </div>

          <div style={{ marginBottom: 24 }}>
            <BankrollTracker />
          </div>

          <Card>
            <CardTitle>Recent Bets</CardTitle>
            {recent.length === 0 ? (
              <p className="md-text-muted" style={{ fontSize: 13, padding: "16px 0" }}>
                No bets yet. Add picks to your slip and place a bet.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="md-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Match</th>
                      <th>Market</th>
                      <th>Selection</th>
                      <th>Stake</th>
                      <th>Odds</th>
                      <th>Return</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((b) => {
                      const ret = b.result === "WIN" ? b.stake * b.odds : b.result === "LOSS" ? 0 : null
                      return (
                        <tr key={b.id}>
                          <td className="md-mono">{b.created_at.slice(0, 10)}</td>
                          <td>{b.teams}</td>
                          <td>{b.market}</td>
                          <td>{b.selection}</td>
                          <td className="md-mono">${b.stake.toFixed(2)}</td>
                          <td className="md-mono">{b.odds.toFixed(2)}</td>
                          <td className="md-mono">
                            {ret != null ? `$${ret.toFixed(2)}` : "—"}
                          </td>
                          <td>
                            <span className={
                              b.result === "WIN" ? "md-text-positive" :
                              b.result === "LOSS" ? "md-text-negative" :
                              b.result === "PENDING" ? "md-text-muted" : ""
                            }>
                              {b.result}
                            </span>
                          </td>
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
    </div>
  )
}
