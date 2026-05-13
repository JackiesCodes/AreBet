"use client"

import { useEffect, useMemo, useState } from "react"
import type { Match, SortKey } from "@/types/match"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { useFilters, leagueKey } from "@/contexts/FilterContext"
import { useFavorites } from "@/hooks/useFavorites"
import { rankMatches } from "@/lib/utils/rank-matches"
import { BUCKET_ORDER, bucketFor, type TimeBucket } from "@/lib/utils/time"
import { IntelligenceBar } from "@/components/features/nav/IntelligenceBar"
import { ActiveFilterChips } from "@/components/features/nav/ActiveFilterChips"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ErrorState } from "@/components/primitives/ErrorState"
import { cn } from "@/lib/utils/cn"
import { loadUiState, saveUiState, type UiState } from "@/lib/storage/ui-state"
import { MobileFilterSheet } from "@/components/layout/MobileFilterSheet"
import { MobileStatusTabs } from "./MobileStatusTabs"
import { MatchBucketList } from "./MatchBucketList"
import { MatchTableView } from "./MatchTableView"

export function HomeBoard() {
  const {
    matches,
    loading,
    error,
    fetchedAt,
    latestChangeMap,
    changedMatchIds,
    setWatchedMatchIds,
  } = useMatchIntelligence()

  const { applyToMatches, disabledLeagues, activeFilterCount, statusFilter, setStatusFilter } = useFilters()
  const { favorites, isFavorite } = useFavorites()
  const [ui, setUi] = useState<UiState>(loadUiState())
  const [sort, setSort] = useState<SortKey>("kickoff")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const statusCounts = useMemo(() => ({
    all:      matches.length,
    live:     matches.filter((m) => m.status === "LIVE").length,
    upcoming: matches.filter((m) => m.status === "UPCOMING").length,
    finished: matches.filter((m) => m.status === "FINISHED").length,
  }), [matches])

  useEffect(() => { saveUiState(ui) }, [ui])

  useEffect(() => {
    const ids = new Set(
      favorites
        .filter((f) => f.entity_type === "match")
        .map((f) => f.entity_id),
    )
    setWatchedMatchIds(ids)
  }, [favorites, setWatchedMatchIds])

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
    }

    switch (ui.quickFilter) {
      case "live":     list = list.filter((m) => m.status === "LIVE");                                                                      break
      case "soon":     list = list.filter((m) => m.status === "UPCOMING" && new Date(m.kickoffISO).getTime() <= Date.now() + 3_600_000);    break
      case "favorites": list = list.filter((m) => isFavorite("match", String(m.id)));                                                       break
      case "high":     list = list.filter((m) => (m.prediction?.confidence ?? 0) >= 70);                                                    break
    }

    const sorted = rankMatches(list, sort)
    return sorted.sort((a, b) => {
      if (a.status !== b.status) return 0
      return (changedMatchIds.has(a.id) ? 0 : 1) - (changedMatchIds.has(b.id) ? 0 : 1)
    })
  }, [matches, applyToMatches, disabledLeagues, ui, sort, isFavorite, changedMatchIds])

  const grouped = useMemo(() => {
    const groups: Record<TimeBucket, Match[]> = {
      live: [], in1h: [], today: [], tomorrow: [], upcoming: [], finished: [],
    }
    for (const m of filtered) groups[bucketFor(m)].push(m)
    return groups
  }, [filtered])

  return (
    <section className="cc-feed">
      <IntelligenceBar matches={matches} fetchedAt={fetchedAt ?? undefined} />

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
        <div className="cc-toolbar-group">
          <button type="button" aria-pressed={sort === "confidence"} className={cn("cc-toolbar-btn", sort === "confidence" && "cc-toolbar-btn--active")} onClick={() => setSort("confidence")}>Conf.</button>
          <button type="button" aria-pressed={sort === "kickoff"} className={cn("cc-toolbar-btn", sort === "kickoff" && "cc-toolbar-btn--active")} onClick={() => setSort("kickoff")}>Kickoff</button>
        </div>
        <div className="cc-toolbar-group">
          <button type="button" aria-pressed={ui.view === "card"} className={cn("cc-toolbar-btn", ui.view === "card" && "cc-toolbar-btn--active")} onClick={() => setUi((u) => ({ ...u, view: "card" }))}>Cards</button>
          <button type="button" aria-pressed={ui.view === "table"} className={cn("cc-toolbar-btn", ui.view === "table" && "cc-toolbar-btn--active")} onClick={() => setUi((u) => ({ ...u, view: "table" }))}>Table</button>
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
          <EmptyState title="No matches" text="Try clearing filters or selecting a different league." />
        )}

        {!loading && !error && filtered.length > 0 && ui.view === "card" && (
          BUCKET_ORDER.map((bucket) => {
            const items = grouped[bucket]
            if (items.length === 0) return null
            return <MatchBucketList key={bucket} bucket={bucket} items={items} latestChangeMap={latestChangeMap} />
          })
        )}

        {!loading && !error && filtered.length > 0 && ui.view === "table" && (
          <MatchTableView filtered={filtered} />
        )}
      </div>
    </section>
  )
}
