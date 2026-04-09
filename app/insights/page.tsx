"use client"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { PerformanceChart } from "@/components/analytics/PerformanceChart"
import { ValueEdgeChart } from "@/components/analytics/ValueEdgeChart"
import { TrendIndicator } from "@/components/analytics/TrendIndicator"
import { DEMO_BETS } from "@/lib/demo/bets"
import { useMemo } from "react"

export default function InsightsPage() {
  const summary = useMemo(() => {
    const wins = DEMO_BETS.filter((b) => b.result === "WIN").length
    const losses = DEMO_BETS.filter((b) => b.result === "LOSS").length
    const settled = wins + losses
    const winRate = settled > 0 ? (wins / settled) * 100 : 0
    const profit = DEMO_BETS.reduce((acc, b) => {
      if (b.result === "WIN") return acc + b.stake * b.odds - b.stake
      if (b.result === "LOSS") return acc - b.stake
      return acc
    }, 0)
    const totalStake = DEMO_BETS.reduce((acc, b) => acc + b.stake, 0)
    const roi = totalStake > 0 ? (profit / totalStake) * 100 : 0
    return { wins, losses, winRate, profit, roi }
  }, [])

  const perfData = useMemo(() => {
    const byDay = new Map<string, { roi: number; winRate: number; count: number; wins: number }>()
    DEMO_BETS.forEach((b) => {
      const d = b.created_at.slice(5, 10)
      const e = byDay.get(d) ?? { roi: 0, winRate: 0, count: 0, wins: 0 }
      const profit = b.result === "WIN" ? b.stake * b.odds - b.stake : b.result === "LOSS" ? -b.stake : 0
      e.roi += (profit / b.stake) * 100
      e.count += 1
      if (b.result === "WIN") e.wins += 1
      e.winRate = (e.wins / e.count) * 100
      byDay.set(d, e)
    })
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, roi: Math.round(v.roi / v.count), winRate: Math.round(v.winRate) }))
  }, [])

  const edgeData = [
    { market: "1X2", edge: 4.2 },
    { market: "BTTS", edge: 2.1 },
    { market: "OVER25", edge: -1.5 },
    { market: "UNDER25", edge: 0.8 },
    { market: "DNB", edge: 3.4 },
  ]

  return (
    <div className="md-page">
      <PageHeader title="Insights" subtitle="Track your model edge and performance" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Card>
          <CardSubtitle>Win Rate</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.winRate.toFixed(1)}%</div>
          <TrendIndicator value={summary.winRate} previous={50} suffix="%" />
        </Card>
        <Card>
          <CardSubtitle>ROI</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.roi.toFixed(1)}%</div>
          <TrendIndicator value={summary.roi} previous={0} suffix="%" />
        </Card>
        <Card>
          <CardSubtitle>Profit</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>${summary.profit.toFixed(2)}</div>
        </Card>
        <Card>
          <CardSubtitle>Settled Bets</CardSubtitle>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{summary.wins + summary.losses}</div>
        </Card>
      </div>

      <Card>
        <CardTitle>Performance Over Time</CardTitle>
        <CardSubtitle>ROI and win rate by day</CardSubtitle>
        <PerformanceChart data={perfData} />
      </Card>

      <div style={{ marginTop: 24 }}>
        <Card>
          <CardTitle>Value Edge by Market</CardTitle>
          <CardSubtitle>Model probability vs market probability</CardSubtitle>
          <ValueEdgeChart data={edgeData} />
        </Card>
      </div>
    </div>
  )
}
