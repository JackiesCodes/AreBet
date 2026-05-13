"use client"

import type { Match } from "@/types/match"
import { Sparkline } from "@/components/primitives/Sparkline"
import { FeatureGate } from "@/components/primitives/FeatureGate"
import { useFormatOdds } from "@/hooks/useFormatOdds"

export function MatchOddsTab({ match }: { match: Match }) {
  const fmt = useFormatOdds()
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h4 className="insight-section-title">Bookmaker Comparison</h4>
      {match.bookmakerOdds.length === 0 ? (
        <p className="md-text-muted">No odds available.</p>
      ) : (
        <table className="md-table">
          <thead><tr><th>Bookmaker</th><th>1</th><th>X</th><th>2</th></tr></thead>
          <tbody>
            {match.bookmakerOdds.map((b) => (
              <tr key={b.bookmaker}>
                <td>{b.bookmaker}</td>
                <td className="md-mono">{fmt(b.home)}</td>
                <td className="md-mono">{fmt(b.draw)}</td>
                <td className="md-mono">{fmt(b.away)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {match.marketHistory.length > 0 && (
        <FeatureGate feature="market-movement" featureName="Market movement">
          <div>
            <h4 className="insight-section-title">Market Movement (Home)</h4>
            <Sparkline values={match.marketHistory.map((p) => p.home)} height={64} />
          </div>
        </FeatureGate>
      )}
    </div>
  )
}
