"use client"

import { useMatchFeed } from "@/hooks/useMatchFeed"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { OddsComparison } from "@/components/analytics/OddsComparison"
import { PageHeader } from "@/components/layout/PageHeader"

export default function OddsComparisonPage() {
  const { matches, loading } = useMatchFeed({ pollIntervalMs: 30_000 })
  const upcoming = matches.filter((m) => m.status !== "FINISHED").slice(0, 6)

  return (
    <div className="md-page">
      <PageHeader title="Odds Comparison" subtitle="Best price across bookmakers" />
      {loading && <Skeleton variant="grid" count={3} />}
      {!loading && upcoming.length === 0 && (
        <EmptyState
          title="No odds available"
          text="Odds data hasn't loaded yet or no upcoming matches have bookmaker prices. Try again shortly."
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {upcoming.map((m) => (
          <div key={m.id} className="md-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <strong>{m.home.name} vs {m.away.name}</strong>
                <div className="md-text-muted" style={{ fontSize: 11 }}>{m.league}</div>
              </div>
            </div>
            <OddsComparison bookmakerOdds={m.bookmakerOdds} />
          </div>
        ))}
      </div>
    </div>
  )
}
