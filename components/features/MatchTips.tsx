"use client"

import { useMemo, useState } from "react"
import type { Match } from "@/types/match"
import { generateMatchTips, TIP_CATEGORY_LABELS, TIP_CATEGORY_ICONS, type BettingTip, type TipCategory } from "@/lib/utils/betting-tips"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { cn } from "@/lib/utils/cn"

const CATEGORY_ORDER: TipCategory[] = ["result", "goals", "btts", "handicap", "firstgoal", "cleansheet"]

function TipRow({ tip, fmt }: { tip: BettingTip; fmt: (n: number) => string }) {
  const pct = Math.round(tip.probability * 100)
  const confClass = tip.confidence === "high" ? "tip-conf--high" : tip.confidence === "mid" ? "tip-conf--mid" : "tip-conf--low"

  return (
    <div className={cn("match-tip-row", tip.isValue && "match-tip-row--value")}>
      <div className="match-tip-row-main">
        <div className="match-tip-selection">
          {tip.isValue && <span className="tip-value-dot" title="Value bet" />}
          <span>{tip.selection}</span>
        </div>

        <div className="match-tip-prob">
          <div className="tip-prob-bar-wrap">
            <div className="tip-prob-bar" style={{ width: `${pct}%` }} />
          </div>
          <span className={cn("tip-conf-badge", confClass)}>{pct}%</span>
        </div>

        {tip.odds > 0 ? (
          <span className={cn("match-tip-odds", tip.isValue && "match-tip-odds--value")}>
            {fmt(tip.odds)}
          </span>
        ) : (
          <span className="match-tip-odds match-tip-odds--na">—</span>
        )}
      </div>

      <div className="match-tip-rationale">{tip.rationale}</div>

      {tip.isValue && tip.odds > 0 && (
        <div className="match-tip-edge">
          Model {(tip.modelProb * 100).toFixed(0)}% vs market {(tip.impliedProb * 100).toFixed(0)}%
          {" "}· <strong>+{(tip.edge * 100).toFixed(1)}% edge</strong>
        </div>
      )}

      {tip.dataQuality !== "confirmed" && (
        <div className="match-tip-inferred" title={
          tip.dataQuality === "model"
            ? "Result probabilities derived from Poisson model using real xG data"
            : "No match-specific data — generic average xG used"
        }>
          {tip.dataQuality === "model" ? "~ Poisson model" : "⚠ Generic estimate"}
        </div>
      )}
    </div>
  )
}

interface Props {
  match: Match
}

export function MatchTips({ match }: Props) {
  const fmt = useFormatOdds()
  const [activeCategory, setActiveCategory] = useState<TipCategory>("result")

  const matchTips = useMemo(() => generateMatchTips(match), [match])
  const byCategory = useMemo(() => {
    const map = new Map<TipCategory, BettingTip[]>()
    for (const t of matchTips.tips) {
      const arr = map.get(t.category) ?? []
      arr.push(t)
      map.set(t.category, arr)
    }
    return map
  }, [matchTips.tips])

  const activeTips = byCategory.get(activeCategory) ?? []
  const valueTips = matchTips.tips.filter((t) => t.isValue)

  return (
    <div className="match-tips">
      {/* Value summary strip */}
      {valueTips.length > 0 && (
        <div className="match-tips-value-strip">
          <span className="match-tips-value-strip-icon">▲</span>
          <span>
            <strong>{valueTips.length} value {valueTips.length === 1 ? "tip" : "tips"}</strong>
            {" "}— model edge vs market: {valueTips.map((t) => `${t.market} (${t.selection})`).slice(0, 2).join(", ")}
            {valueTips.length > 2 ? ` +${valueTips.length - 2} more` : ""}
          </span>
        </div>
      )}

      {/* Category tabs */}
      <div className="match-tips-tabs">
        {CATEGORY_ORDER.map((cat) => {
          const tips = byCategory.get(cat) ?? []
          if (tips.length === 0) return null
          const hasValue = tips.some((t) => t.isValue)
          return (
            <button
              key={cat}
              type="button"
              className={cn("match-tips-tab", activeCategory === cat && "match-tips-tab--active")}
              onClick={() => setActiveCategory(cat)}
            >
              <span>{TIP_CATEGORY_ICONS[cat]}</span>
              <span>{TIP_CATEGORY_LABELS[cat]}</span>
              {hasValue && <span className="match-tips-tab-value-dot" />}
            </button>
          )
        })}
      </div>

      {/* Tips list */}
      <div className="match-tips-list">
        {activeTips.length === 0 ? (
          <p className="md-text-muted" style={{ padding: "16px 0" }}>No tips available for this market.</p>
        ) : (
          activeTips.map((t) => <TipRow key={t.id} tip={t} fmt={fmt} />)
        )}
      </div>

      {/* Disclaimer */}
      <p className="match-tips-disclaimer">
        Probabilities are model estimates derived from expected goals (xG) and match data.
        Tips marked ▲ VALUE have positive edge vs bookmaker implied odds.
        Gamble responsibly — tips are informational only.
      </p>
    </div>
  )
}
