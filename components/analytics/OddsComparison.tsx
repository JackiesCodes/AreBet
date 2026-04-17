"use client"

import type { BookmakerOdds } from "@/types/match"
import { useFormatOdds } from "@/hooks/useFormatOdds"

interface OddsComparisonProps {
  bookmakerOdds: BookmakerOdds[]
}

interface ArbResult {
  exists: boolean
  margin: number          // < 0 means guaranteed profit; e.g. -0.023 = 2.3% arb
  bestHome: number
  bestDraw: number
  bestAway: number
  bestHomeBook: string
  bestDrawBook: string
  bestAwayBook: string
}

function detectArbitrage(bookmakerOdds: BookmakerOdds[]): ArbResult {
  let bestHome = 0, bestDraw = 0, bestAway = 0
  let bestHomeBook = "", bestDrawBook = "", bestAwayBook = ""

  for (const b of bookmakerOdds) {
    if (b.home > bestHome) { bestHome = b.home; bestHomeBook = b.bookmaker }
    if (b.draw > bestDraw) { bestDraw = b.draw; bestDrawBook = b.bookmaker }
    if (b.away > bestAway) { bestAway = b.away; bestAwayBook = b.bookmaker }
  }

  const margin = 1 / bestHome + 1 / bestDraw + 1 / bestAway - 1
  return { exists: margin < 0, margin, bestHome, bestDraw, bestAway, bestHomeBook, bestDrawBook, bestAwayBook }
}

export function OddsComparison({ bookmakerOdds }: OddsComparisonProps) {
  const fmt = useFormatOdds()

  if (bookmakerOdds.length === 0) {
    return (
      <p className="odds-no-data">
        Odds not yet available for this match — bookmaker prices usually appear 48–72 hours before kick-off.
      </p>
    )
  }

  const arb = detectArbitrage(bookmakerOdds)

  return (
    <div className="odds-comp-root">
      {arb.exists && (
        <div className="odds-arb-alert">
          <span className="odds-arb-icon">⚡</span>
          <div>
            <strong>Arbitrage opportunity detected</strong>
            <span className="odds-arb-pct"> +{(Math.abs(arb.margin) * 100).toFixed(2)}% guaranteed return</span>
            <div className="odds-arb-detail">
              Back Home @ {fmt(arb.bestHome)} ({arb.bestHomeBook}) ·
              Draw @ {fmt(arb.bestDraw)} ({arb.bestDrawBook}) ·
              Away @ {fmt(arb.bestAway)} ({arb.bestAwayBook})
            </div>
          </div>
        </div>
      )}

      <table className="md-table">
        <thead>
          <tr>
            <th>Bookmaker</th>
            <th title="Home win">1</th>
            <th title="Draw">X</th>
            <th title="Away win">2</th>
            <th title="Overround — lower is better for punters" className="odds-margin-col">Margin</th>
          </tr>
        </thead>
        <tbody>
          {bookmakerOdds.map((b) => {
            const overround = (1 / b.home + 1 / b.draw + 1 / b.away - 1) * 100
            return (
              <tr key={b.bookmaker}>
                <td>{b.bookmaker}</td>
                <td className="md-mono" style={{ color: b.home === arb.bestHome ? "var(--positive)" : undefined, fontWeight: b.home === arb.bestHome ? 700 : undefined }}>
                  {fmt(b.home)}
                </td>
                <td className="md-mono" style={{ color: b.draw === arb.bestDraw ? "var(--positive)" : undefined, fontWeight: b.draw === arb.bestDraw ? 700 : undefined }}>
                  {fmt(b.draw)}
                </td>
                <td className="md-mono" style={{ color: b.away === arb.bestAway ? "var(--positive)" : undefined, fontWeight: b.away === arb.bestAway ? 700 : undefined }}>
                  {fmt(b.away)}
                </td>
                <td className="md-mono odds-margin-col" style={{ color: overround < 5 ? "var(--positive)" : overround > 10 ? "var(--negative)" : "var(--text-muted)" }}>
                  {overround.toFixed(1)}%
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="odds-best-row">
            <td><strong>Best</strong></td>
            <td className="md-mono" style={{ color: "var(--positive)", fontWeight: 700 }}>{fmt(arb.bestHome)}</td>
            <td className="md-mono" style={{ color: "var(--positive)", fontWeight: 700 }}>{fmt(arb.bestDraw)}</td>
            <td className="md-mono" style={{ color: "var(--positive)", fontWeight: 700 }}>{fmt(arb.bestAway)}</td>
            <td className="md-mono" style={{ color: arb.margin < 0 ? "var(--positive)" : "var(--text-muted)" }}>
              {arb.margin < 0 ? `ARB ${(Math.abs(arb.margin) * 100).toFixed(2)}%` : `${(arb.margin * 100).toFixed(1)}%`}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
