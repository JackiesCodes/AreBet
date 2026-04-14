"use client"

import { useMemo, useState } from "react"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import {
  generateFeedTips,
  TIP_CATEGORY_LABELS,
  TIP_CATEGORY_ICONS,
  type FeedTip,
  type TipCategory,
} from "@/lib/utils/betting-tips"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { formatTime } from "@/lib/utils/time"
import Link from "next/link"
import { cn } from "@/lib/utils/cn"

const CATEGORIES: Array<{ key: TipCategory | "all"; label: string; icon: string }> = [
  { key: "all", label: "All Tips", icon: "✦" },
  { key: "result", label: TIP_CATEGORY_LABELS.result, icon: TIP_CATEGORY_ICONS.result },
  { key: "goals", label: TIP_CATEGORY_LABELS.goals, icon: TIP_CATEGORY_ICONS.goals },
  { key: "btts", label: TIP_CATEGORY_LABELS.btts, icon: TIP_CATEGORY_ICONS.btts },
  { key: "handicap", label: TIP_CATEGORY_LABELS.handicap, icon: TIP_CATEGORY_ICONS.handicap },
  { key: "firstgoal", label: TIP_CATEGORY_LABELS.firstgoal, icon: TIP_CATEGORY_ICONS.firstgoal },
  { key: "cleansheet", label: TIP_CATEGORY_LABELS.cleansheet, icon: TIP_CATEGORY_ICONS.cleansheet },
]

function TipCard({ tip, fmt }: { tip: FeedTip; fmt: (n: number) => string }) {
  const pct = Math.round(tip.probability * 100)
  const confClass = tip.confidence === "high" ? "tip-conf--high" : tip.confidence === "mid" ? "tip-conf--mid" : "tip-conf--low"

  return (
    <div className={cn("tip-card", tip.isValue && "tip-card--value")}>
      {tip.isValue && (
        <span className="tip-value-badge">▲ VALUE +{(tip.edge * 100).toFixed(1)}%</span>
      )}

      {/* Match context */}
      <div className="tip-match-label">
        <Link href={`/match/${tip.matchId}`} className="tip-match-link">
          {tip.home} vs {tip.away}
        </Link>
        <span className="tip-match-meta">
          {tip.league} · {tip.status === "LIVE" ? <span className="tip-live-dot">● LIVE</span> : formatTime(tip.kickoffISO)}
        </span>
      </div>

      {/* Market + selection */}
      <div className="tip-market">{tip.market}</div>
      <div className="tip-selection">{tip.selection}</div>

      {/* Probability bar */}
      <div className="tip-prob-row">
        <div className="tip-prob-bar-wrap">
          <div className="tip-prob-bar" style={{ width: `${pct}%` }} />
        </div>
        <span className={cn("tip-conf-badge", confClass)}>{pct}%</span>
      </div>

      {/* Odds + rationale */}
      <div className="tip-footer">
        <span className="tip-rationale">{tip.rationale}</span>
        {tip.odds > 0 && (
          <span className="tip-odds">{fmt(tip.odds)}</span>
        )}
      </div>
    </div>
  )
}

export default function PredictionsPage() {
  const { matches, loading } = useMatchIntelligence()
  const fmt = useFormatOdds()
  const [category, setCategory] = useState<TipCategory | "all">("all")
  const [valueOnly, setValueOnly] = useState(false)
  const [minConf, setMinConf] = useState(50)

  const allTips = useMemo(() => generateFeedTips(matches), [matches])

  const filtered = useMemo(() => {
    return allTips.filter((t) => {
      if (category !== "all" && t.category !== category) return false
      if (valueOnly && !t.isValue) return false
      if (Math.round(t.probability * 100) < minConf) return false
      return true
    })
  }, [allTips, category, valueOnly, minConf])

  const valueTipCount = allTips.filter((t) => t.isValue).length

  return (
    <div className="md-page">
      <PageHeader
        title="Predictions"
        subtitle={loading ? "Loading tips…" : `${allTips.length} tips across ${matches.filter(m => m.status !== "FINISHED").length} matches`}
      />

      {/* Value tip banner */}
      {!loading && valueTipCount > 0 && (
        <div className="tip-value-banner">
          <span className="tip-value-banner-icon">▲</span>
          <span><strong>{valueTipCount} value {valueTipCount === 1 ? "tip" : "tips"}</strong> found where model probability exceeds market implied odds by 5%+</span>
          <button
            className={cn("md-btn md-btn--sm", valueOnly ? "md-btn--primary" : "md-btn--ghost")}
            onClick={() => setValueOnly((v) => !v)}
            type="button"
          >
            {valueOnly ? "Show all" : "Value only"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="tip-filters">
        {/* Category tabs */}
        <div className="tip-cat-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={cn("tip-cat-tab", category === c.key && "tip-cat-tab--active")}
              onClick={() => setCategory(c.key)}
            >
              <span>{c.icon}</span>
              <span className="tip-cat-tab-label">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Confidence threshold */}
        <div className="tip-conf-filter">
          <span className="tip-conf-filter-label">Min confidence:</span>
          {[45, 55, 65].map((v) => (
            <button
              key={v}
              type="button"
              className={cn("md-btn md-btn--sm", minConf === v ? "md-btn--primary" : "md-btn--ghost")}
              onClick={() => setMinConf(v)}
            >
              {v}%+
            </button>
          ))}
        </div>
      </div>

      {loading && <Skeleton variant="list" count={8} />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          title="No tips match your filters"
          text="Try lowering the confidence threshold or selecting a different category."
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="tip-grid">
          {filtered.map((t) => (
            <TipCard key={`${t.matchId}-${t.id}`} tip={t} fmt={fmt} />
          ))}
        </div>
      )}
    </div>
  )
}
