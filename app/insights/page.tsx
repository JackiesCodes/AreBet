"use client"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { PerformanceChart } from "@/components/analytics/PerformanceChart"
import { ValueEdgeChart } from "@/components/analytics/ValueEdgeChart"
import { TrendIndicator } from "@/components/analytics/TrendIndicator"
import { Skeleton } from "@/components/primitives/Skeleton"
import { useBets } from "@/hooks/useBets"

export default function InsightsPage() {
  const { summary, dailyPerf, marketEdge, loading, isDemo } = useBets()

  if (loading) {
    return (
      <div className="md-page">
        <PageHeader title="Insights" subtitle="Track your model edge and performance" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Skeleton count={4} />
        </div>
        <Skeleton />
      </div>
    )
  }

  const edgeData = marketEdge.length > 0
    ? marketEdge
    : [
        { market: "1X2", edge: 0 },
        { market: "BTTS", edge: 0 },
        { market: "OVER25", edge: 0 },
      ]

  return (
    <div className="md-page">
      <PageHeader
        title="Insights"
        subtitle={isDemo ? "Sample data — sign in to track your real performance" : "Your betting performance"}
      />

      {isDemo && (
        <div className="md-banner md-banner--info" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 12 }}>
          Showing demo data. Sign in and place bets to see your real stats.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Card>
          <CardSubtitle>Win Rate</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.winRate.toFixed(1)}%</div>
          <TrendIndicator value={summary.winRate} previous={50} suffix="%" />
        </Card>
        <Card>
          <CardSubtitle>ROI</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700, color: summary.roi >= 0 ? "var(--md-positive)" : "var(--md-negative)" }}>
            {summary.roi >= 0 ? "+" : ""}{summary.roi.toFixed(1)}%
          </div>
          <TrendIndicator value={summary.roi} previous={0} suffix="%" />
        </Card>
        <Card>
          <CardSubtitle>Profit / Loss</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700, color: summary.profit >= 0 ? "var(--md-positive)" : "var(--md-negative)" }}>
            {summary.profit >= 0 ? "+$" : "-$"}{Math.abs(summary.profit).toFixed(2)}
          </div>
        </Card>
        <Card>
          <CardSubtitle>Settled Bets</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.wins + summary.losses}</div>
          <div className="md-text-muted" style={{ fontSize: 11 }}>
            {summary.wins}W · {summary.losses}L · {summary.pending} pending
          </div>
        </Card>
      </div>

      {dailyPerf.length > 0 && (
        <Card className="mb-6">
          <CardTitle>Performance Over Time</CardTitle>
          <CardSubtitle>ROI and win rate by day</CardSubtitle>
          <PerformanceChart data={dailyPerf} />
        </Card>
      )}

      <Card>
        <CardTitle>Value Edge by Market</CardTitle>
        <CardSubtitle>Your ROI per betting market</CardSubtitle>
        <ValueEdgeChart data={edgeData} />
      </Card>
    </div>
  )
}
