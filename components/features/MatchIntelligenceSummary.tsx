"use client"

import { useMemo } from "react"
import type { Match } from "@/types/match"
import { calculateValueEdge, buildPredictionFactors } from "@/lib/utils/value-bet"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { confTier } from "@/lib/utils/match-status"

interface Props {
  match: Match
}

export function MatchIntelligenceSummary({ match }: Props) {
  const fmt = useFormatOdds()
  const valueEdge = useMemo(() => calculateValueEdge(match), [match])
  const factors = useMemo(
    () => match.prediction.factors ?? buildPredictionFactors(match),
    [match],
  )
  const tier = confTier(match.prediction.confidence)

  return (
    <div className="match-intel">
      {/* Confidence + signal row */}
      <div className="match-intel-row">
        <div className={`match-intel-conf match-intel-conf--${tier}`}>
          <span className="match-intel-conf-num">{Math.round(match.prediction.confidence)}%</span>
          <span className="match-intel-conf-label">confidence</span>
        </div>

        <div className="match-intel-advice">
          <span className="match-intel-advice-text">{match.prediction.advice}</span>
          <span className="match-intel-advice-sub">
            xG {match.prediction.expectedGoals.home} – {match.prediction.expectedGoals.away}
          </span>
        </div>

        {valueEdge && (
          <div className={`match-intel-edge ${valueEdge.isValue ? "match-intel-edge--value" : "match-intel-edge--none"}`}>
            {valueEdge.isValue ? (
              <>
                <span className="match-intel-edge-label">▲ Value spot</span>
                <span className="match-intel-edge-detail">
                  {valueEdge.selection.toUpperCase()} @ {fmt(valueEdge.odds)} · +{(valueEdge.edge * 100).toFixed(1)}% edge
                </span>
                <span className="match-intel-edge-sub">
                  Model {(valueEdge.modelProb * 100).toFixed(0)}% vs market {(valueEdge.impliedProb * 100).toFixed(0)}%
                </span>
              </>
            ) : (
              <span className="match-intel-edge-none">
                No value edge (best {(valueEdge.edge * 100).toFixed(1)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Top prediction factors */}
      {factors.length > 0 && (
        <div className="match-intel-factors">
          <div className="match-intel-factors-title">Why this signal</div>
          <div className="match-intel-factors-list">
            {factors.slice(0, 3).map((f, i) => (
              <div key={i} className={`match-intel-factor match-intel-factor--${f.impact}`}>
                <span className="match-intel-factor-icon">
                  {f.impact === "positive" ? "+" : f.impact === "negative" ? "−" : "·"}
                </span>
                <div>
                  <div className="match-intel-factor-label">{f.label}</div>
                  <div className="match-intel-factor-detail">{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
