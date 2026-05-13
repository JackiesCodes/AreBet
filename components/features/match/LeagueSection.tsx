"use client"

import { useState } from "react"
import type { Match } from "@/types/match"
import { MatchCard } from "./MatchCard"
import type { MatchChange } from "@/types/alerts"

interface LeagueSectionProps {
  league: string
  matches: Match[]
  compact?: boolean
  latestChangeMap?: Map<number, MatchChange>
  defaultExpanded?: boolean
}

export function LeagueSection({
  league,
  matches,
  compact,
  latestChangeMap,
  defaultExpanded = true,
}: LeagueSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="league-section">
      <button
        type="button"
        className="league-section-header"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <span className="league-section-name">{league}</span>
        <span className="league-section-count">{matches.length}</span>
        <span className={`league-section-chevron ${expanded ? "league-section-chevron--open" : ""}`}>
          ›
        </span>
      </button>

      {expanded && (
        <div className="league-section-body">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              compact={compact}
              showLeague={false}
              latestChange={latestChangeMap?.get(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
