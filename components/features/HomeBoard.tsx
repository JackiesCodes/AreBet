"use client"

import { useEffect, useMemo, useState } from "react"
import type { Match, SortKey } from "@/types/match"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { useFilters } from "@/contexts/FilterContext"
import { useFavorites } from "@/hooks/useFavorites"
import { rankMatches } from "@/lib/utils/rank-matches"
import { BUCKET_LABELS, BUCKET_ORDER, bucketFor, type TimeBucket } from "@/lib/utils/time"
import { MatchCard } from "./MatchCard"
import { MatchTableRow } from "./MatchTableRow"
import { IntelligenceBar } from "./IntelligenceBar"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ErrorState } from "@/components/primitives/ErrorState"
import { cn } from "@/lib/utils/cn"
import { loadUiState, saveUiState, type UiState } from "@/lib/storage/ui-state"

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

  const { applyToMatches } = useFilters()
  const { favorites, isFavorite } = useFavorites()
  const [ui, setUi] = useState<UiState>(loadUiState())
  const [sort, setSort] = useState<SortKey>("kickoff")
  const [selected, setSelected] = useState<Match | null>(null)

  useEffect(() => {
    saveUiState(ui)
  }, [ui])

  // Sync watched match IDs into the intelligence context
  useEffect(() => {
    const ids = new Set(
      favorites
        .filter((f) => f.entity_type === "match")
        .map((f) => f.entity_id),
    )
    setWatchedMatchIds(ids)
  }, [favorites, setWatchedMatchIds])

  const filtered = useMemo(() => {
    // Global sidebar filters applied first
    let list = applyToMatches(matches)

    // Local search
    if (ui.search) {
      const q = ui.search.toLowerCase()
      list = list.filter(
        (m) =>
          m.home.name.toLowerCase().includes(q) ||
          m.away.name.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q),
      )
    }

    // Quick filters (favorites, soon, high confidence)
    switch (ui.quickFilter) {
      case "live":
        list = list.filter((m) => m.status === "LIVE")
        break
      case "soon": {
        const cutoff = Date.now() + 60 * 60 * 1000
        list = list.filter((m) => m.status === "UPCOMING" && new Date(m.kickoffISO).getTime() <= cutoff)
        break
      }
      case "favorites":
        list = list.filter((m) => isFavorite("match", String(m.id)))
        break
      case "high":
        list = list.filter((m) => (m.prediction?.confidence ?? 0) >= 70)
        break
      default:
        break
    }

    const sorted = rankMatches(list, sort)
    return sorted.sort((a, b) => {
      const aChanged = changedMatchIds.has(a.id) ? 0 : 1
      const bChanged = changedMatchIds.has(b.id) ? 0 : 1
      if (a.status !== b.status) return 0
      return aChanged - bChanged
    })
  }, [matches, applyToMatches, ui, sort, isFavorite, changedMatchIds])

  const grouped = useMemo(() => {
    const groups: Record<TimeBucket, Match[]> = {
      live: [],
      in1h: [],
      today: [],
      tomorrow: [],
      upcoming: [],
      finished: [],
    }
    for (const m of filtered) {
      groups[bucketFor(m)].push(m)
    }
    return groups
  }, [filtered])

  return (
    <div className="cc-root">
      <section className="cc-feed">
        <IntelligenceBar matches={matches} fetchedAt={fetchedAt ?? undefined} />
        <div className="cc-toolbar">
          <div className="cc-search">
            <input
              type="search"
              placeholder="Search matches…"
              value={ui.search}
              onChange={(e) => setUi((u) => ({ ...u, search: e.target.value }))}
            />
          </div>
          <div className="cc-toolbar-group">
            <button
              type="button"
              className={cn("cc-toolbar-btn", sort === "confidence" && "cc-toolbar-btn--active")}
              onClick={() => setSort("confidence")}
            >
              Conf.
            </button>
            <button
              type="button"
              className={cn("cc-toolbar-btn", sort === "kickoff" && "cc-toolbar-btn--active")}
              onClick={() => setSort("kickoff")}
            >
              Kickoff
            </button>
          </div>
          <div className="cc-toolbar-group">
            <button
              type="button"
              className={cn("cc-toolbar-btn", ui.view === "card" && "cc-toolbar-btn--active")}
              onClick={() => setUi((u) => ({ ...u, view: "card" }))}
            >
              Cards
            </button>
            <button
              type="button"
              className={cn("cc-toolbar-btn", ui.view === "table" && "cc-toolbar-btn--active")}
              onClick={() => setUi((u) => ({ ...u, view: "table" }))}
            >
              Table
            </button>
          </div>
        </div>

        <div className="cc-section-body">
          {loading && <Skeleton variant="cc" count={5} />}
          {error && <ErrorState text={error} />}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState title="No matches" text="Try clearing filters or selecting a different league." />
          )}

          {ui.view === "card" ? (
            BUCKET_ORDER.map((bucket) => {
              const items = grouped[bucket]
              if (items.length === 0) return null
              return (
                <div key={bucket} className="cc-bucket">
                  <div className="cc-bucket-head">
                    <span>{BUCKET_LABELS[bucket]}</span>
                    <span className="cc-bucket-line" />
                    <span className="md-mono md-text-muted">{items.length}</span>
                  </div>
                  <div className="cc-match-list">
                    {items.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        selected={selected?.id === m.id}
                        onSelect={setSelected}
                        latestChange={latestChangeMap.get(m.id)}
                        compact
                      />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            !loading &&
            !error &&
            filtered.length > 0 && (
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>League</th>
                    <th>Match</th>
                    <th>Score</th>
                    <th>Conf.</th>
                    <th>1</th>
                    <th>X</th>
                    <th>2</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <MatchTableRow key={m.id} match={m} onSelect={setSelected} />
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </section>
    </div>
  )
}
