"use client"

import { useMemo, useState } from "react"
import type { Match } from "@/types/match"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { useFilters } from "@/contexts/FilterContext"
import { rankMatches } from "@/lib/utils/rank-matches"
import { LeagueSection } from "./LeagueSection"
import { groupByLeague } from "@/lib/utils/league-groups"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { ErrorState } from "@/components/primitives/ErrorState"

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

  const leagueGroups = useMemo(() => groupByLeague(filtered), [filtered])

  return (
    <div className="md-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 className="md-page-title">{title}</h1>
          <p className="md-page-subtitle">{filtered.length} matches · {leagueGroups.length} competitions</p>
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
      <div className="cc-league-groups">
        {leagueGroups.map((g) => (
          <LeagueSection
            key={g.league}
            league={g.league}
            matches={g.matches}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}
