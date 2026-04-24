"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"
import type { SearchEntity } from "@/app/api/search/route"

interface GlobalSearchProps {
  onClose: () => void
}

interface SearchResponse {
  entities: SearchEntity[]
  matches: Match[]
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function TeamLogo({ logo, name }: { logo?: string; name: string }) {
  if (logo) {
    return (
      <Image
        src={logo}
        alt={name}
        width={22}
        height={22}
        unoptimized
        style={{ borderRadius: 3, objectFit: "contain" }}
      />
    )
  }
  return <span className="gs-team-initial">{name.slice(0, 1).toUpperCase()}</span>
}

function EntityImage({ image, name, type }: { image: string | null; name: string; type: SearchEntity["type"] }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={40}
        height={40}
        unoptimized
        className={cn("gs-entity-img", type === "player" || type === "coach" ? "gs-entity-img--round" : "")}
      />
    )
  }
  return (
    <span className={cn("gs-entity-initial", type === "player" || type === "coach" ? "gs-entity-initial--round" : "")}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

function entityHref(entity: SearchEntity): string {
  switch (entity.type) {
    case "team": return `/teams/${entity.id}`
    case "player": return `/players/${entity.id}`
    case "league": return `/leagues/${entity.id}`
    case "coach": return `/coaches/${entity.id}`
    case "venue": return `/venues/${entity.id}`
  }
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [apiData, setApiData] = useState<SearchResponse>({ entities: [], matches: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tilesRef = useRef<HTMLDivElement>(null)
  const { matches: feedMatches } = useMatchIntelligence()
  const debouncedQuery = useDebounce(query, 350)

  // Mouse drag-to-scroll on entity tiles
  useEffect(() => {
    const el = tilesRef.current
    if (!el) return
    let isDown = false
    let startX = 0
    let scrollLeft = 0
    let hasDragged = false

    const onMouseDown = (e: MouseEvent) => {
      isDown = true
      hasDragged = false
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
      el.style.cursor = "grabbing"
    }
    const onMouseLeave = () => { isDown = false; el.style.cursor = "grab" }
    const onMouseUp = () => { isDown = false; el.style.cursor = "grab" }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      const walk = x - startX
      if (Math.abs(walk) > 4) hasDragged = true
      el.scrollLeft = scrollLeft - walk
    }
    // Suppress click on child links if we actually dragged
    const onClickCapture = (e: MouseEvent) => {
      if (hasDragged) { e.preventDefault(); e.stopPropagation(); hasDragged = false }
    }

    el.style.cursor = "grab"
    el.addEventListener("mousedown", onMouseDown)
    el.addEventListener("mouseleave", onMouseLeave)
    el.addEventListener("mouseup", onMouseUp)
    el.addEventListener("mousemove", onMouseMove)
    el.addEventListener("click", onClickCapture, true)
    return () => {
      el.removeEventListener("mousedown", onMouseDown)
      el.removeEventListener("mouseleave", onMouseLeave)
      el.removeEventListener("mouseup", onMouseUp)
      el.removeEventListener("mousemove", onMouseMove)
      el.removeEventListener("click", onClickCapture, true)
    }
  }, [apiData.entities])

  // Focus input and wire Escape key
  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Global API search — fires on debounced query >= 3 chars
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 3) {
      setApiData({ entities: [], matches: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    const controller = new AbortController()

    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: SearchResponse) => setApiData(data))
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [debouncedQuery])

  // Merge: local feed results (instant) + API results (from all dates)
  const q = query.trim().toLowerCase()

  // Team IDs surfaced by entity search (e.g. player → their club)
  const entityTeamIds = new Set(
    apiData.entities
      .filter((e) => e.type === "team")
      .map((e) => e.id)
  )

  const localMatches = q.length >= 2
    ? feedMatches.filter((m) =>
        m.home.name.toLowerCase().includes(q) ||
        m.away.name.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q) ||
        // also include live matches for teams found via entity search
        (m.home.id != null && entityTeamIds.has(m.home.id)) ||
        (m.away.id != null && entityTeamIds.has(m.away.id)),
      )
    : []

  const localIds = new Set(localMatches.map((m) => m.id))
  const apiOnly = apiData.matches.filter((m) => !localIds.has(m.id))

  // Rank matches
  const LEAGUE_POP: Record<number, number> = {
    2: 100, 3: 95, 848: 88, 39: 90, 140: 90, 135: 90, 78: 90, 61: 90,
    1: 88, 4: 86, 13: 82, 45: 78, 94: 72, 88: 72, 71: 72, 253: 68, 262: 64,
  }
  function namePop(name: string, ql: string): number {
    const n = name.toLowerCase()
    if (n === ql) return 3
    if (n.startsWith(ql)) return 2
    if (n.includes(ql)) return 1
    return 0
  }
  function score(m: Match): number {
    const ns = Math.max(namePop(m.home.name, q), namePop(m.away.name, q), namePop(m.league, q))
    const lp = (m.leagueId ? LEAGUE_POP[m.leagueId] : 0) ?? 5
    return ns * 1000 + lp
  }
  function rank(arr: Match[]) {
    return [...arr].sort((a, b) => {
      const aLive = a.status === "LIVE" ? 1 : 0
      const bLive = b.status === "LIVE" ? 1 : 0
      if (aLive !== bLive) return bLive - aLive
      const sd = score(b) - score(a)
      if (sd !== 0) return sd
      return new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime()
    })
  }

  const results = [...rank(localMatches), ...rank(apiOnly)].slice(0, 15)
  const entities = apiData.entities

  const hasQuery = q.length >= 2
  const showEmpty = hasQuery && !loading && results.length === 0 && entities.length === 0

  // Navigate to first result on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (entities.length > 0) {
        router.push(entityHref(entities[0]))
        onClose()
      } else if (results[0]) {
        router.push(`/match/${results[0].id}`)
        onClose()
      }
    }
  }

  return (
    <div className="gs-backdrop" onClick={onClose}>
      <div className="gs-modal" onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="gs-input-row">
          {loading ? (
            <span className="gs-spinner" aria-hidden />
          ) : (
            <svg className="gs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            className="gs-input"
            placeholder="Search any team, player, league…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              className="gs-clear-btn"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <button className="gs-close-btn" onClick={onClose} aria-label="Close search">
            Esc
          </button>
        </div>

        {/* Entity tiles — horizontal scroll, always outside scroll area */}
        {hasQuery && entities.length > 0 && (
          <div className="gs-entities-section">
            <div className="gs-entities-scroll" ref={tilesRef}>
              {entities.map((entity) => (
                <Link
                  key={`${entity.type}-${entity.id}`}
                  href={entityHref(entity)}
                  className="gs-entity-tile"
                  onClick={onClose}
                >
                  <div className="gs-entity-img-wrap">
                    <EntityImage image={entity.image} name={entity.name} type={entity.type} />
                    <span className={cn("gs-entity-type-badge", `gs-entity-type-badge--${entity.type}`)}>
                      {entity.type === "coach" ? "MGR" : entity.type.slice(0, 1).toUpperCase() + entity.type.slice(1)}
                    </span>
                  </div>
                  <span className="gs-entity-name">{entity.name}</span>
                  {entity.meta && <span className="gs-entity-meta">{entity.meta}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Match results — scrollable */}
        {hasQuery && results.length > 0 && (
          <ul className="gs-results">
            {entities.length > 0 && (
              <li><p className="gs-section-label">Matches</p></li>
            )}
            {results.map((m) => (
              <li key={m.id}>
                <Link href={`/match/${m.id}`} className="gs-result-item" onClick={onClose}>
                  {/* Two logos stacked */}
                  <span className="gs-result-teams">
                    <TeamLogo logo={m.home.logo} name={m.home.name} />
                    <span className="gs-vs">vs</span>
                    <TeamLogo logo={m.away.logo} name={m.away.name} />
                  </span>
                  {/* Text */}
                  <span className="gs-result-body">
                    <span className="gs-result-title">
                      {m.home.name} vs {m.away.name}
                    </span>
                    <span className="gs-result-sub">
                      {m.league} · {m.country}
                    </span>
                  </span>
                  {/* Status badge */}
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
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <p className="gs-footer-hint">
          {!hasQuery && "Search teams, players, leagues, coaches and venues"}
          {hasQuery && loading && "Searching…"}
          {showEmpty && `No results found for "${query.trim()}"`}
          {hasQuery && !loading && (entities.length > 0 || results.length > 0) &&
            `${results.length} match${results.length !== 1 ? "es" : ""} · ${entities.length} entit${entities.length !== 1 ? "ies" : "y"} — Enter to open first`}
        </p>
      </div>
    </div>
  )
}
