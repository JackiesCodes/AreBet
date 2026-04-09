"use client"

import { useAuth } from "@/lib/auth/context"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { TierBadge } from "@/components/primitives/TierBadge"
import { DEMO_BETS } from "@/lib/demo/bets"

export default function UserDashboard() {
  const { user } = useAuth()
  const recent = DEMO_BETS.slice(0, 8)

  return (
    <div className="md-page">
      <PageHeader
        title="Your Dashboard"
        subtitle={user?.email ? `Signed in as ${user.email}` : "Personal overview"}
        actions={<TierBadge tier="free" />}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Card>
          <CardSubtitle>Total Bets</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{DEMO_BETS.length}</div>
        </Card>
        <Card>
          <CardSubtitle>Wins</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{DEMO_BETS.filter((b) => b.result === "WIN").length}</div>
        </Card>
        <Card>
          <CardSubtitle>Losses</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{DEMO_BETS.filter((b) => b.result === "LOSS").length}</div>
        </Card>
      </div>

      <Card>
        <CardTitle>Recent Bets</CardTitle>
        <table className="md-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Match</th>
              <th>Market</th>
              <th>Selection</th>
              <th>Stake</th>
              <th>Odds</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((b) => (
              <tr key={b.id}>
                <td className="md-mono">{b.created_at.slice(0, 10)}</td>
                <td>{b.teams}</td>
                <td>{b.market}</td>
                <td>{b.selection}</td>
                <td className="md-mono">${b.stake}</td>
                <td className="md-mono">{b.odds.toFixed(2)}</td>
                <td>
                  <span className={
                    b.result === "WIN" ? "md-text-positive" :
                    b.result === "LOSS" ? "md-text-negative" : "md-text-muted"
                  }>
                    {b.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
