"use client"

import type { BookmakerOdds } from "@/types/match"
import { useFormatOdds } from "@/hooks/useFormatOdds"

interface OddsComparisonProps {
  bookmakerOdds: BookmakerOdds[]
}

export function OddsComparison({ bookmakerOdds }: OddsComparisonProps) {
  const fmt = useFormatOdds()
  if (bookmakerOdds.length === 0) return null

  const bestHome = Math.max(...bookmakerOdds.map((b) => b.home))
  const bestDraw = Math.max(...bookmakerOdds.map((b) => b.draw))
  const bestAway = Math.max(...bookmakerOdds.map((b) => b.away))

  return (
    <table className="md-table">
      <thead>
        <tr>
          <th>Bookmaker</th>
          <th>1</th>
          <th>X</th>
          <th>2</th>
        </tr>
      </thead>
      <tbody>
        {bookmakerOdds.map((b) => (
          <tr key={b.bookmaker}>
            <td>{b.bookmaker}</td>
            <td className="md-mono" style={{ color: b.home === bestHome ? "var(--positive)" : undefined }}>
              {fmt(b.home)}
            </td>
            <td className="md-mono" style={{ color: b.draw === bestDraw ? "var(--positive)" : undefined }}>
              {fmt(b.draw)}
            </td>
            <td className="md-mono" style={{ color: b.away === bestAway ? "var(--positive)" : undefined }}>
              {fmt(b.away)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
