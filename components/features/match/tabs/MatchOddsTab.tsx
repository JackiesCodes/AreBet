"use client"

import type { Match } from "@/types/match"
import { Sparkline } from "@/components/primitives/Sparkline"
import { FeatureGate } from "@/components/primitives/FeatureGate"
import { OddsButton } from "@/components/features/betslip/OddsButton"
import { useAllOdds } from "@/hooks/useAllOdds"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import type { BetMarket } from "@/contexts/BetSlipContext"

interface MarketDef {
  marketCode: BetMarket
  marketLabel: string
  selections: Array<{ code: string; label: string }>
}

function getMarketDefs(match: Match): MarketDef[] {
  return [
    {
      marketCode: "MATCH_WINNER",
      marketLabel: "Match Winner (1X2)",
      selections: [
        { code: "HOME", label: match.home.name },
        { code: "DRAW", label: "Draw" },
        { code: "AWAY", label: match.away.name },
      ],
    },
    {
      marketCode: "DOUBLE_CHANCE",
      marketLabel: "Double Chance",
      selections: [
        { code: "HOME_DRAW", label: `${match.home.name} or Draw` },
        { code: "DRAW_AWAY", label: `Draw or ${match.away.name}` },
        { code: "HOME_AWAY", label: `${match.home.name} or ${match.away.name}` },
      ],
    },
    {
      marketCode: "BTTS",
      marketLabel: "Both Teams to Score",
      selections: [
        { code: "YES", label: "Yes" },
        { code: "NO", label: "No" },
      ],
    },
    {
      marketCode: "OVER_25",
      marketLabel: "Goals Over/Under 2.5",
      selections: [
        { code: "OVER", label: "Over 2.5" },
        { code: "UNDER", label: "Under 2.5" },
      ],
    },
  ]
}

export function MatchOddsTab({ match }: { match: Match }) {
  const fmt = useFormatOdds()
  const isUpcoming = match.status === "UPCOMING"
  const { oddsMap, loading } = useAllOdds(match.id, isUpcoming)
  const marketDefs = getMarketDefs(match)
  const matchLabel = `${match.home.name} vs ${match.away.name}`

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Interactive betting markets */}
      {isUpcoming && (
        <div>
          <h4 className="insight-section-title">Bet Markets</h4>
          {loading ? (
            <div className="odds-markets-loading">Loading markets…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {marketDefs.map((group) => {
                const rows = group.selections.map((sel) => ({
                  ...sel,
                  quote: oddsMap.get(`${group.marketCode}:${sel.code}`),
                })).filter((s) => s.quote)

                if (rows.length === 0) return null

                return (
                  <div key={group.marketCode} className="odds-market-group">
                    <div className="odds-market-label">{group.marketLabel}</div>
                    <div className="odds-row">
                      {rows.map((sel) => (
                        <OddsButton
                          key={sel.code}
                          fixtureId={match.id}
                          matchLabel={matchLabel}
                          league={match.league}
                          market={group.marketCode}
                          marketLabel={group.marketLabel}
                          selection={sel.code}
                          selectionLabel={sel.label}
                          odds={sel.quote!.odds}
                          oddsSnapshotId={sel.quote!.snapshotId}
                          kickoffISO={match.kickoffISO}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bookmaker comparison (real-API mode only) */}
      {match.bookmakerOdds.length > 0 && (
        <div>
          <h4 className="insight-section-title">Bookmaker Comparison</h4>
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
        </div>
      )}

      {match.marketHistory.length > 0 && (
        <FeatureGate feature="market-movement" featureName="Market movement">
          <div>
            <h4 className="insight-section-title">Market Movement (Home)</h4>
            <Sparkline values={match.marketHistory.map((p) => p.home)} height={64} />
          </div>
        </FeatureGate>
      )}

      {!isUpcoming && match.bookmakerOdds.length === 0 && (
        <p className="md-text-muted">Odds are only available for upcoming matches.</p>
      )}
    </div>
  )
}
