"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { FeatureGate } from "@/components/primitives/FeatureGate"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { leaguePrioritySort } from "@/lib/utils/league-groups"
import {
  generateFeedTips,
  TIP_CATEGORY_LABELS,
  TIP_CATEGORY_ICONS,
  type FeedTip,
  type TipCategory,
} from "@/lib/utils/betting-tips"
import { useFormatOdds } from "@/hooks/useFormatOdds"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import { cn } from "@/lib/utils/cn"

// ── Date filter ────────────────────────────────────────────────────────────────

type DateFilter = "today" | "tomorrow" | "weekend" | "all"

function getDateBucket(kickoffISO: string): "today" | "tomorrow" | "weekend" | "other" {
  const d = new Date(kickoffISO)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const matchDay   = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays   = Math.round((matchDay.getTime() - todayStart.getTime()) / 86400000)
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "tomorrow"
  const dow = matchDay.getDay()
  if ((dow === 0 || dow === 6) && diffDays >= 0 && diffDays <= 7) return "weekend"
  return "other"
}

function matchesDateFilter(kickoffISO: string, f: DateFilter): boolean {
  if (f === "all") return true
  const bucket = getDateBucket(kickoffISO)
  if (f === "today")   return bucket === "today"
  if (f === "tomorrow") return bucket === "tomorrow"
  if (f === "weekend") return bucket === "weekend"
  return true
}

const DATE_TABS: { key: DateFilter; label: string }[] = [
  { key: "today",    label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "weekend",  label: "Weekend" },
  { key: "all",      label: "All" },
]

// ── Quality / confidence helpers ────────────────────────────────────────────

const QUALITY_BADGE: Record<string, { label: string; className: string; title: string }> = {
  confirmed: {
    label: "✓ API",
    className: "tip-quality-badge tip-quality--confirmed",
    title: "Probabilities from API-Football prediction model",
  },
  model: {
    label: "~ Poisson",
    className: "tip-quality-badge tip-quality--model",
    title: "Result probabilities derived from Poisson model using real xG data",
  },
  estimated: {
    label: "⚠ Est.",
    className: "tip-quality-badge tip-quality--estimated",
    title: "No match-specific data available — generic average xG used. Not reliable.",
  },
}

const CATEGORIES: Array<{ key: TipCategory | "all"; label: string; icon: string }> = [
  { key: "all", label: "All Tips", icon: "✦" },
  { key: "result", label: TIP_CATEGORY_LABELS.result, icon: TIP_CATEGORY_ICONS.result },
  { key: "goals", label: TIP_CATEGORY_LABELS.goals, icon: TIP_CATEGORY_ICONS.goals },
  { key: "btts", label: TIP_CATEGORY_LABELS.btts, icon: TIP_CATEGORY_ICONS.btts },
  { key: "handicap", label: TIP_CATEGORY_LABELS.handicap, icon: TIP_CATEGORY_ICONS.handicap },
  { key: "firstgoal", label: TIP_CATEGORY_LABELS.firstgoal, icon: TIP_CATEGORY_ICONS.firstgoal },
  { key: "cleansheet", label: TIP_CATEGORY_LABELS.cleansheet, icon: TIP_CATEGORY_ICONS.cleansheet },
]

// ── Best picks strip ────────────────────────────────────────────────────────

function BestPickCard({ tip, fmt }: { tip: FeedTip; fmt: (n: number) => string }) {
  const pct = Math.round(tip.probability * 100)
  return (
    <Link href={`/match/${tip.matchId}`} className={cn("best-pick-card", tip.isValue && "best-pick-card--value")}>
      {tip.isValue && (
        <span className="best-pick-edge">▲ +{(tip.edge * 100).toFixed(0)}%</span>
      )}
      <span className="best-pick-match">
        {tip.home} <span className="best-pick-vs">vs</span> {tip.away}
      </span>
      <span className="best-pick-selection">{tip.selection}</span>
      <div className="best-pick-footer">
        <span className="best-pick-conf">{pct}% conf</span>
        {tip.odds > 0 && <span className="best-pick-odds">{fmt(tip.odds)}</span>}
      </div>
    </Link>
  )
}

function BestPicksStrip({ tips, fmt }: { tips: FeedTip[]; fmt: (n: number) => string }) {
  if (tips.length === 0) return null
  return (
    <div className="best-picks-wrap">
      <div className="best-picks-header">
        <span className="best-picks-title">⚡ Today&rsquo;s Best Picks</span>
        <span className="best-picks-sub">Value &amp; high-confidence tips</span>
      </div>
      <div className="best-picks-scroll">
        {tips.map((t) => (
          <BestPickCard key={`${t.matchId}-${t.id}`} tip={t} fmt={fmt} />
        ))}
      </div>
    </div>
  )
}

// ── Tip card ────────────────────────────────────────────────────────────────

function TipCard({ tip, fmt }: { tip: FeedTip; fmt: (n: number) => string }) {
  const pct = Math.round(tip.probability * 100)
  const confClass = tip.confidence === "high" ? "tip-conf--high" : tip.confidence === "mid" ? "tip-conf--mid" : "tip-conf--low"
  const qualityBadge = QUALITY_BADGE[tip.dataQuality]

  return (
    <div className={cn("tip-card", tip.isValue && "tip-card--value", tip.dataQuality === "estimated" && "tip-card--estimated")}>
      <div className="tip-badge-row">
        {tip.isValue && (
          <span className="tip-value-badge">▲ VALUE +{(tip.edge * 100).toFixed(1)}%</span>
        )}
        {qualityBadge && (
          <span className={qualityBadge.className} title={qualityBadge.title}>
            {qualityBadge.label}
          </span>
        )}
      </div>

      <div className="tip-match-label">
        <Link href={`/match/${tip.matchId}`} className="tip-match-link">
          {tip.home} vs {tip.away}
        </Link>
        <span className="tip-match-meta">
          {tip.league} · {tip.status === "LIVE"
            ? <span className="tip-live-dot">● LIVE</span>
            : `${formatShortDate(tip.kickoffISO)} · ${formatTime(tip.kickoffISO)}`}
        </span>
      </div>

      <div className="tip-market">{tip.market}</div>
      <div className="tip-selection">{tip.selection}</div>

      <div className="tip-prob-row">
        <div className="tip-prob-bar-wrap">
          <div className="tip-prob-bar" style={{ width: `${pct}%` }} />
        </div>
        <span className={cn("tip-conf-badge", confClass)}>{pct}%</span>
      </div>

      <div className="tip-footer">
        <span className="tip-rationale">{tip.rationale}</span>
        {tip.odds > 0 && (
          <span className="tip-odds">{fmt(tip.odds)}</span>
        )}
      </div>
    </div>
  )
}

function TipLeagueSection({ league, tips, fmt }: { league: string; tips: FeedTip[]; fmt: (n: number) => string }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="league-section">
      <button
        type="button"
        className="league-section-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="league-section-name">{league}</span>
        <span className="league-section-count">{tips.length}</span>
        <span className={`league-section-chevron ${expanded ? "league-section-chevron--open" : ""}`}>›</span>
      </button>
      {expanded && (
        <div className="league-section-body tip-grid">
          {tips.map((t) => (
            <TipCard key={`${t.matchId}-${t.id}`} tip={t} fmt={fmt} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
  const { matches, loading } = useMatchIntelligence()
  const fmt = useFormatOdds()
  const [category, setCategory]   = useState<TipCategory | "all">("all")
  const [valueOnly, setValueOnly] = useState(false)
  const [minConf, setMinConf]     = useState(50)
  const [dateFilter, setDateFilter] = useState<DateFilter>("today")

  const allTips = useMemo(() => generateFeedTips(matches), [matches])

  // Best picks: top 3 from today — value tips first, then high-conf
  const bestPicks = useMemo(() => {
    const today = allTips.filter((t) => matchesDateFilter(t.kickoffISO, "today"))
    const value  = today.filter((t) => t.isValue).sort((a, b) => b.edge - a.edge)
    const highConf = today
      .filter((t) => !t.isValue && t.confidence === "high")
      .sort((a, b) => b.probability - a.probability)
    return [...value, ...highConf].slice(0, 5)
  }, [allTips])

  // Count per date bucket for tab badges
  const dateCounts = useMemo(() => {
    const counts: Record<DateFilter, number> = { today: 0, tomorrow: 0, weekend: 0, all: allTips.length }
    for (const t of allTips) {
      const b = getDateBucket(t.kickoffISO)
      if (b === "today")   counts.today++
      if (b === "tomorrow") counts.tomorrow++
      if (b === "weekend") counts.weekend++
    }
    return counts
  }, [allTips])

  const filtered = useMemo(() => {
    return allTips.filter((t) => {
      if (!matchesDateFilter(t.kickoffISO, dateFilter)) return false
      if (category !== "all" && t.category !== category) return false
      if (valueOnly && !t.isValue) return false
      if (Math.round(t.probability * 100) < minConf) return false
      return true
    })
  }, [allTips, dateFilter, category, valueOnly, minConf])

  const groupedByLeague = useMemo((): Array<{ label: string; tips: FeedTip[] }> => {
    const map = new Map<string | number, FeedTip[]>()
    for (const tip of filtered) {
      const key = tip.leagueId != null ? tip.leagueId : `${tip.league}::${tip.country}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tip)
    }
    const nameCount = new Map<string, number>()
    for (const tips of map.values()) {
      const name = tips[0].league
      nameCount.set(name, (nameCount.get(name) ?? 0) + 1)
    }
    return Array.from(map.values())
      .map((tips) => {
        const isDuplicate = (nameCount.get(tips[0].league) ?? 0) > 1
        const label = isDuplicate && tips[0].country
          ? `${tips[0].league} · ${tips[0].country}`
          : tips[0].league
        return { label, tips }
      })
      .sort((a, b) => leaguePrioritySort(a.label, b.label))
  }, [filtered])

  const valueTipCount    = allTips.filter((t) => t.isValue).length
  const confirmedCount   = allTips.filter((t) => t.dataQuality === "confirmed").length
  const modelCount       = allTips.filter((t) => t.dataQuality === "model").length

  const subtitle = loading
    ? "Loading tips…"
    : `${allTips.length} tips · ${confirmedCount} API-confirmed · ${modelCount} Poisson model`

  return (
    <div className="md-page">
      <PageHeader title="Predictions" subtitle={subtitle} />

      {/* Best picks strip — today only, always above filters */}
      {!loading && <BestPicksStrip tips={bestPicks} fmt={fmt} />}

      {/* Value banner */}
      {!loading && valueTipCount > 0 && (
        <div className="tip-value-banner">
          <span className="tip-value-banner-icon">▲</span>
          <span>
            <strong>{valueTipCount} value {valueTipCount === 1 ? "tip" : "tips"}</strong> found where
            model probability exceeds market implied odds by 5%+
          </span>
          <button
            className={cn("md-btn md-btn--sm", valueOnly ? "md-btn--primary" : "md-btn--ghost")}
            onClick={() => setValueOnly((v) => !v)}
            aria-pressed={valueOnly}
            type="button"
          >
            {valueOnly ? "Show all" : "Value only"}
          </button>
        </div>
      )}

      <div className="tip-filters">
        {/* Date tabs */}
        <div className="tip-date-tabs" role="group" aria-label="Filter by date">
          {DATE_TABS.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={dateFilter === d.key}
              className={cn("tip-date-tab", dateFilter === d.key && "tip-date-tab--active")}
              onClick={() => setDateFilter(d.key)}
            >
              {d.label}
              {d.key !== "all" && dateCounts[d.key] > 0 && (
                <span className="tip-date-tab-count">{dateCounts[d.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="tip-cat-tabs" role="group" aria-label="Filter by tip category">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={category === c.key}
              className={cn("tip-cat-tab", category === c.key && "tip-cat-tab--active")}
              onClick={() => setCategory(c.key)}
            >
              <span>{c.icon}</span>
              <span className="tip-cat-tab-label">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Confidence filter */}
        <div className="tip-conf-filter">
          <span className="tip-conf-filter-label">Min confidence:</span>
          {[45, 55, 65].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={minConf === v}
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
          text={
            dateFilter !== "all"
              ? `No tips for ${dateFilter === "today" ? "today" : dateFilter === "tomorrow" ? "tomorrow" : "the weekend"} — try "All" to see the full range.`
              : "Try lowering the confidence threshold or selecting a different category."
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <FeatureGate feature="advanced-odds" featureName="Full predictions breakdown">
          <div className="tip-league-groups">
            {groupedByLeague.map(({ label, tips }) => (
              <TipLeagueSection key={label} league={label} tips={tips} fmt={fmt} />
            ))}
          </div>
        </FeatureGate>
      )}
    </div>
  )
}
