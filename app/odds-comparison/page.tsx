"use client"

import { useMemo, useState } from "react"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { OddsComparison } from "@/components/analytics/OddsComparison"
import { PageHeader } from "@/components/layout/PageHeader"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import Link from "next/link"
import { cn } from "@/lib/utils/cn"

type Filter = "all" | "live" | "arb"

function hasArb(bms: { home: number; draw: number; away: number }[]): boolean {
  if (bms.length < 2) return false
  const bH = Math.max(...bms.map((b) => b.home))
  const bD = Math.max(...bms.map((b) => b.draw))
  const bA = Math.max(...bms.map((b) => b.away))
  return 1 / bH + 1 / bD + 1 / bA < 1
}

export default function OddsComparisonPage() {
  const { matches, loading } = useMatchIntelligence()
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")

  const withOdds = useMemo(
    () => matches.filter((m) => m.status !== "FINISHED" && m.bookmakerOdds.length > 0),
    [matches],
  )

  const filtered = useMemo(() => {
    let list = withOdds
    if (filter === "live") list = list.filter((m) => m.status === "LIVE")
    if (filter === "arb") list = list.filter((m) => hasArb(m.bookmakerOdds))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.home.name.toLowerCase().includes(q) ||
          m.away.name.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q),
      )
    }
    return list
  }, [withOdds, filter, search])

  const arbCount = useMemo(() => withOdds.filter((m) => hasArb(m.bookmakerOdds)).length, [withOdds])

  return (
    <div className="md-page">
      <PageHeader
        title="Odds Comparison"
        subtitle={loading ? "Loading…" : `${withOdds.length} matches with bookmaker prices${arbCount > 0 ? ` · ${arbCount} arb opportunit${arbCount === 1 ? "y" : "ies"}` : ""}`}
      />

      {!loading && (
        <div className="odds-toolbar">
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "live", "arb"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={cn("md-btn md-btn--sm", filter === f ? "md-btn--primary" : "md-btn--ghost")}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
              >
                {f === "all" ? "All" : f === "live" ? "● Live" : `⚡ Arb${arbCount > 0 ? ` (${arbCount})` : ""}`}
              </button>
            ))}
          </div>
          <input
            className="md-input"
            placeholder="Search matches…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
            aria-label="Search matches"
          />
        </div>
      )}

      {loading && <Skeleton variant="grid" count={3} />}

      {!loading && withOdds.length === 0 && (
        <EmptyState
          title="No odds available yet"
          text="Bookmaker prices usually appear 48–72 hours before kick-off. Check back closer to match time."
        />
      )}

      {!loading && filtered.length === 0 && withOdds.length > 0 && (
        <EmptyState
          title="No matches match your filter"
          text={filter === "arb" ? "No arbitrage opportunities right now. Check back as prices update." : "Try adjusting your search."}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {filtered.map((m) => (
          <div key={m.id} className="md-card odds-match-card">
            <div className="odds-match-header">
              <div>
                <Link href={`/match/${m.id}`} className="odds-match-title">
                  {m.home.name} vs {m.away.name}
                </Link>
                <div className="md-text-muted" style={{ fontSize: 11 }}>
                  {m.league}
                  {" · "}
                  {m.status === "LIVE"
                    ? <span className="live-dot">● LIVE {m.minute ? `${m.minute}'` : ""}</span>
                    : `${formatShortDate(m.kickoffISO)} · ${formatTime(m.kickoffISO)}`
                  }
                </div>
              </div>
              {hasArb(m.bookmakerOdds) && (
                <span className="odds-arb-badge">⚡ ARB</span>
              )}
            </div>
            <OddsComparison bookmakerOdds={m.bookmakerOdds} />
          </div>
        ))}
      </div>
    </div>
  )
}
