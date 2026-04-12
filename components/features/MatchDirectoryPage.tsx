"use client"

import { useMemo, useState } from "react"
import type { Match } from "@/types/match"
import { useMatchFeed } from "@/hooks/useMatchFeed"
import { rankMatches } from "@/lib/utils/rank-matches"
import { MatchCard } from "./MatchCard"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ErrorState } from "@/components/primitives/ErrorState"

interface MatchDirectoryPageProps {
  title: string
  filter?: (m: Match) => boolean
  compact?: boolean
}

export function MatchDirectoryPage({ title, filter, compact }: MatchDirectoryPageProps) {
  const { matches, loading, error } = useMatchFeed({ pollIntervalMs: 30_000 })
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    let list = matches
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
  }, [matches, filter, search])

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
        {filtered.map((m) => (
          <MatchCard key={m.id} match={m} compact={compact} />
        ))}
      </div>
    </div>
  )
}
