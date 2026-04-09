"use client"

import { useEffect, useMemo, useState } from "react"
import type { Match, SortKey, StatusFilter } from "@/types/match"
import { useMatchFeed } from "@/hooks/useMatchFeed"
import { useFavorites } from "@/hooks/useFavorites"
import { rankMatches } from "@/lib/utils/rank-matches"
import { BUCKET_LABELS, BUCKET_ORDER, bucketFor, type TimeBucket } from "@/lib/utils/time"
import { LeaguePanel } from "./LeaguePanel"
import { MatchCard } from "./MatchCard"
import { MatchTableRow } from "./MatchTableRow"
import { MatchInsightPanel } from "./MatchInsightPanel"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ErrorState } from "@/components/primitives/ErrorState"
import { cn } from "@/lib/utils/cn"
import { loadUiState, saveUiState, type UiState } from "@/lib/storage/ui-state"

export function HomeBoard() {
  const { matches, loading, error } = useMatchFeed({ pollIntervalMs: 30_000 })
  const { isFavorite } = useFavorites()
  const [ui, setUi] = useState<UiState>(loadUiState())
  const [sort, setSort] = useState<SortKey>("kickoff")
  const [selected, setSelected] = useState<Match | null>(null)

  useEffect(() => {
    saveUiState(ui)
  }, [ui])

  const filtered = useMemo(() => {
    let list = matches
    if (ui.activeLeague) list = list.filter((m) => m.league === ui.activeLeague)
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
    return rankMatches(list, sort)
  }, [matches, ui, sort, isFavorite])

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
      <LeaguePanel
        matches={matches}
        activeLeague={ui.activeLeague}
        onSelectLeague={(league) => setUi((u) => ({ ...u, activeLeague: league }))}
        quickFilter={ui.quickFilter}
        onQuickFilter={(quickFilter) => setUi((u) => ({ ...u, quickFilter }))}
      />

      <section className="cc-feed">
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

      <MatchInsightPanel match={selected ?? filtered[0] ?? null} />
    </div>
  )
}
