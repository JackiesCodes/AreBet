"use client"

import type { RefObject } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils/cn"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import { EmptyState } from "@/components/primitives/EmptyState"
import type { Match } from "@/types/match"

function TeamLogo({ logo, name }: { logo?: string; name: string }) {
  if (logo) {
    return (
      <Image
        src={logo}
        alt={name}
        width={22}
        height={22}
        style={{ borderRadius: 3, objectFit: "contain" }}
      />
    )
  }
  return <span className="gs-team-initial">{name.slice(0, 1).toUpperCase()}</span>
}

interface SearchMatchResultsProps {
  results: Match[]
  activeIdx: number
  query: string
  hasEntities: boolean
  listRef: RefObject<HTMLUListElement | null>
  onSelect: (match: Match) => void
  onHover: (idx: number) => void
  /** Show "no results" state — only when search is complete and empty */
  showEmpty: boolean
}

export function SearchMatchResults({
  results,
  activeIdx,
  query,
  hasEntities,
  listRef,
  onSelect,
  onHover,
  showEmpty,
}: SearchMatchResultsProps) {
  if (showEmpty) {
    return (
      <div className="gs-empty-wrap">
        <EmptyState title={`No results for "${query.trim()}"`} text="Try a different team, player, or league name." />
      </div>
    )
  }

  if (results.length === 0) return null

  return (
    <ul
      id="gs-results-list"
      ref={listRef}
      className="gs-results"
      aria-label="Match results"
      role="listbox"
    >
      {hasEntities && (
        <li aria-hidden="true"><p className="gs-section-label">Matches</p></li>
      )}
      {results.map((m, idx) => (
        <li key={m.id} role="option" aria-selected={activeIdx === idx} id={`gs-result-${idx}`}>
          <button
            type="button"
            className={cn("gs-result-item", activeIdx === idx && "gs-result-item--active")}
            onClick={() => onSelect(m)}
            onMouseEnter={() => onHover(idx)}
          >
            <span className="gs-result-teams" aria-hidden="true">
              <TeamLogo logo={m.home.logo} name={m.home.name} />
              <span className="gs-vs">vs</span>
              <TeamLogo logo={m.away.logo} name={m.away.name} />
            </span>
            <span className="gs-result-body">
              <span className="gs-result-title">{m.home.name} vs {m.away.name}</span>
              <span className="gs-result-sub">{m.league} · {m.country}</span>
            </span>
            {m.status === "LIVE" && (
              <span className={cn("gs-status-badge", "gs-status-badge--live")}>
                {m.score.home}–{m.score.away} · LIVE
              </span>
            )}
            {m.status === "FINISHED" && (
              <span className={cn("gs-status-badge", "gs-status-badge--ft")}>
                {m.score.home}–{m.score.away} · FT
              </span>
            )}
            {m.status === "UPCOMING" && (
              <span className={cn("gs-status-badge", "gs-status-badge--upcoming")}>
                {formatShortDate(m.kickoffISO)} {formatTime(m.kickoffISO)}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
