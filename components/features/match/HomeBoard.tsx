"use client"

import { useEffect, useMemo, useState } from "react"
import type { Match } from "@/types/match"
import { useMatchFeedCtx } from "@/contexts/MatchFeedContext"
import { useFilters, leagueKey } from "@/contexts/FilterContext"
import { useFavorites } from "@/hooks/useFavorites"
import { BUCKET_ORDER, bucketFor, type TimeBucket } from "@/lib/utils/time"
import { ActiveFilterChips } from "@/components/features/nav/ActiveFilterChips"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ErrorState } from "@/components/primitives/ErrorState"
import { loadUiState, saveUiState, type UiState } from "@/lib/storage/ui-state"
import { MobileFilterSheet } from "@/components/layout/MobileFilterSheet"
import { MobileStatusTabs } from "./MobileStatusTabs"
import { MatchBucketList } from "./MatchBucketList"
import type { GlobalStatusFilter } from "@/contexts/FilterContext"

export function HomeBoard() {
  const {
    matches,
    loading,
    error,
  } = useMatchFeedCtx()

  const { applyToMatches, disabledLeagues, activeFilterCount, statusFilter, setStatusFilter } = useFilters()
  const { isFavorite } = useFavorites()
  const [ui, setUi] = useState<UiState>(loadUiState())
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const statusCounts = useMemo((): Record<GlobalStatusFilter, number> => ({
    all:      matches.filter((m) => m.status !== "FINISHED").length,
    live:     matches.filter((m) => m.status === "LIVE").length,
    upcoming: matches.filter((m) => m.status === "UPCOMING").length,
  }), [matches])

  useEffect(() => { saveUiState(ui) }, [ui])

  const filtered = useMemo(() => {
    let list: Match[] = ui.search
      ? (disabledLeagues.size > 0
          ? matches.filter((m) => !disabledLeagues.has(leagueKey(m)))
          : matches)
      : applyToMatches(matches)

    if (ui.search) {
      const q = ui.search.toLowerCase()
      list = list.filter(
        (m) =>
          m.home.name.toLowerCase().includes(q) ||
          m.away.name.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q),
      )
    } else {
      // When not searching, always hide finished
      list = list.filter((m) => m.status !== "FINISHED")
    }

    switch (ui.quickFilter) {
      case "live":      list = list.filter((m) => m.status === "LIVE");                                                                     break
      case "soon":      list = list.filter((m) => m.status === "UPCOMING" && new Date(m.kickoffISO).getTime() <= Date.now() + 3_600_000);   break
      case "favorites": list = list.filter((m) => isFavorite("match", String(m.id)));                                                      break
    }

    return [...list].sort((a, b) => {
      const order: Record<string, number> = { LIVE: 0, UPCOMING: 1, FINISHED: 2 }
      const diff = (order[a.status] ?? 2) - (order[b.status] ?? 2)
      if (diff !== 0) return diff
      return new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime()
    })
  }, [matches, applyToMatches, disabledLeagues, ui, isFavorite])

  const grouped = useMemo(() => {
    const groups: Partial<Record<TimeBucket, Match[]>> = {}
    for (const b of BUCKET_ORDER) groups[b] = []
    for (const m of filtered) {
      const b = bucketFor(m)
      if (b in groups) groups[b]!.push(m)
    }
    return groups as Record<TimeBucket, Match[]>
  }, [filtered])

  return (
    <section className="cc-feed">
      {/* Desktop toolbar */}
      <div className="cc-toolbar cc-toolbar--desktop">
        <div className="cc-search">
          <input
            type="search"
            placeholder="Search matches…"
            aria-label="Search matches"
            value={ui.search}
            onChange={(e) => setUi((u) => ({ ...u, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="cc-toolbar cc-toolbar--mobile">
        <div className="cc-search">
          <input
            type="search"
            placeholder="Search matches…"
            aria-label="Search matches"
            value={ui.search}
            onChange={(e) => setUi((u) => ({ ...u, search: e.target.value }))}
          />
        </div>
        <button
          type="button"
          className="cc-filter-trigger"
          onClick={() => setFilterSheetOpen(true)}
          aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {activeFilterCount > 0 && <span className="cc-filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      <MobileStatusTabs counts={statusCounts} active={statusFilter} onChange={setStatusFilter} />
      <ActiveFilterChips />
      <MobileFilterSheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} />

      <div className="cc-section-body">
        {loading && <Skeleton variant="cc" count={5} />}
        {error && (
          error.includes("Failed to fetch") || error.includes("NetworkError")
            ? <EmptyState title="You&apos;re offline" text="Showing your last cached view. Reconnect to refresh." />
            : <ErrorState text={error} />
        )}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState title="No matches" text={ui.search ? "No matches found. Try a different search term." : "No live or upcoming matches right now."} />
        )}

        {!loading && !error && filtered.length > 0 && (
          BUCKET_ORDER.map((bucket) => {
            const items = grouped[bucket]
            if (!items || items.length === 0) return null
            return <MatchBucketList key={bucket} bucket={bucket} items={items} />
          })
        )}
      </div>
    </section>
  )
}
