"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth/context"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardTitle, CardSubtitle } from "@/components/primitives/Card"
import { TierBadge } from "@/components/primitives/TierBadge"

export default function UserDashboard() {
  const { user } = useAuth()

  return (
    <div className="md-page">
      <PageHeader
        title="Your Dashboard"
        subtitle={user?.email ? `Signed in as ${user.email}` : "Sign in to sync your preferences across devices"}
        actions={<TierBadge tier="free" />}
      />

      {!user && (
        <div className="md-banner md-banner--info" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
          <a href="/auth/login" style={{ color: "var(--primary)", textDecoration: "underline" }}>Sign in</a>
          {" "}to save your preferences and watchlist across devices.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Link href="/predictions" className="dashboard-card-link">
          <Card className="dashboard-card-clickable">
            <CardSubtitle>Predictions</CardSubtitle>
            <CardTitle>Today&apos;s Tips</CardTitle>
            <p className="md-text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Value picks and match insights for today&apos;s fixtures.
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

        <Link href="/subscription" className="dashboard-card-link">
          <Card className="dashboard-card-clickable">
            <CardSubtitle>Subscription</CardSubtitle>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <p className="md-text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Unlock full predictions, market movement, and advanced insights.
            </p>
          </Card>
        </Link>
      </div>

      <Card>
        <CardTitle>Getting Started</CardTitle>
        <ul style={{ marginTop: 12, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
          <li>Browse <Link href="/" style={{ color: "var(--primary)" }}>live and upcoming matches</Link> on the home feed.</li>
          <li>Check <Link href="/predictions" style={{ color: "var(--primary)" }}>today&apos;s predictions</Link> for value picks and confidence tiers.</li>
          <li>Follow leagues and teams via the <strong>Watchlist</strong> in the right panel.</li>
          <li>Upgrade to <Link href="/subscription" style={{ color: "var(--primary)" }}>Pro or Elite</Link> to unlock market movement and advanced analytics.</li>
        </ul>
      </Card>
    </div>
  )
}
