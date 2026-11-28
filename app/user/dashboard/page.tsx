"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth/context"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardTitle, CardSubtitle } from "@/components/primitives/Card"
import { TierBadge } from "@/components/primitives/TierBadge"

export default function UserDashboard() {
  const { user, tier } = useAuth()

  return (
    <div className="md-page">
      <PageHeader
        title="Your Dashboard"
        subtitle={user?.email ? `Signed in as ${user.email}` : "Sign in to sync your preferences across devices"}
        actions={<TierBadge tier={tier ?? "free"} />}
      />

      {!user && (
        <div className="md-banner md-banner--info" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
          <a href="/auth/login" style={{ color: "var(--primary)", textDecoration: "underline" }}>Sign in</a>
          {" "}to save your preferences and watchlist across devices.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Link href="/my-bets" className="dashboard-card-link">
          <Card className="dashboard-card-clickable">
            <CardSubtitle>Betting</CardSubtitle>
            <CardTitle>My Bets</CardTitle>
            <p className="md-text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Track your open and settled bets and your running balance.
            </p>
          </Card>
        </Link>

        <Link href="/standings" className="dashboard-card-link">
          <Card className="dashboard-card-clickable">
            <CardSubtitle>Standings</CardSubtitle>
            <CardTitle>League Tables</CardTitle>
            <p className="md-text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Up-to-date standings across all competitions.
            </p>
          </Card>
        </Link>

        <Link href="/leagues" className="dashboard-card-link">
          <Card className="dashboard-card-clickable">
            <CardSubtitle>Leagues</CardSubtitle>
            <CardTitle>Browse Competitions</CardTitle>
            <p className="md-text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Explore 900+ leagues and competitions worldwide.
            </p>
          </Card>
        </Link>

        <Link href="/deposit" className="dashboard-card-link">
          <Card className="dashboard-card-clickable">
            <CardSubtitle>Account</CardSubtitle>
            <CardTitle>Deposit Funds</CardTitle>
            <p className="md-text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Add funds to your account and start placing bets.
            </p>
          </Card>
        </Link>
      </div>

      <Card>
        <CardTitle>Getting Started</CardTitle>
        <ul style={{ marginTop: 12, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
          <li>Browse <Link href="/" style={{ color: "var(--primary)" }}>live and upcoming matches</Link> on the home feed.</li>
          <li>Add selections to your <strong>Bet Slip</strong> by clicking any odds button.</li>
          <li>Build accumulators by adding multiple selections before placing.</li>
          <li>Head to <Link href="/promotions" style={{ color: "var(--primary)" }}>Promotions</Link> to claim your welcome bonus and free bets.</li>
        </ul>
      </Card>
    </div>
  )
}
