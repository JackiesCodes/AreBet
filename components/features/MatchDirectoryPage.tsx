"use client"

import { useEffect, useMemo, useState } from "react"
import type { Match } from "@/types/match"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { useFilters } from "@/contexts/FilterContext"
import { usePagination } from "@/hooks/usePagination"
import { rankMatches } from "@/lib/utils/rank-matches"
import { MatchCard } from "./MatchCard"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ErrorState } from "@/components/primitives/ErrorState"

const PAGE_SIZE = 24

interface MatchDirectoryPageProps {
  title: string
  filter?: (m: Match) => boolean
  compact?: boolean
}

export function MatchDirectoryPage({ title, filter, compact }: MatchDirectoryPageProps) {
  const { matches, loading, error } = useMatchIntelligence()
  const { applyToMatches } = useFilters()
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    let list = applyToMatches(matches)
    if (filter) list = list.filter(filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.home.name.toLowerCase().includes(q) ||
          m.away.name.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q),
      )
    }
    return rankMatches(list, "kickoff")
  }, [matches, applyToMatches, filter, search])

  const { visibleItems, hasMore, remaining, loadMore, reset } = usePagination(filtered, PAGE_SIZE)

  // Reset to first page when search changes
  useEffect(() => { reset() }, [search, reset])

  return (
    <div className="md-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 className="md-page-title">{title}</h1>
          <p className="md-page-subtitle">{filtered.length} matches</p>
        </div>
        <div className="cc-search" style={{ width: 240 }}>
          <input
            type="search"
            placeholder="Filter…"
            aria-label="Filter matches"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {loading && <Skeleton variant="cc" count={6} />}
      {error && <ErrorState text={error} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No matches" text="Nothing to show right now." />
      )}
      <div className="cc-match-list">
        {visibleItems.map((m) => (
          <MatchCard key={m.id} match={m} compact={compact} />
        ))}
      </div>
      {hasMore && (
        <div className="load-more-wrap">
          <button type="button" className="load-more-btn" onClick={loadMore}>
            Load {remaining} more matches
          </button>
          <span className="load-more-count">{visibleItems.length} of {filtered.length}</span>
        </div>
      )}
    </div>
  )
}
