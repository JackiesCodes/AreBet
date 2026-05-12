"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import { useDebounce } from "@/hooks/useDebounce"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"
import { LEAGUE_POP } from "@/lib/utils/league-groups"
import type { SearchEntity } from "@/app/api/search/route"

interface GlobalSearchProps {
  onClose: () => void
}

interface SearchResponse {
  entities: SearchEntity[]
  matches: Match[]
}

// ── Recent searches (localStorage) ────────────────────────────────────────────

const RECENT_KEY = "arebet-recent-searches"
const MAX_RECENT = 6

function loadRecent(): string[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") } catch { return [] }
}

function saveRecent(query: string) {
  const list = [query, ...loadRecent().filter((q) => q !== query)].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

function removeRecent(query: string) {
  const list = loadRecent().filter((q) => q !== query)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function EntityImage({ image, name, type }: { image: string | null; name: string; type: SearchEntity["type"] }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={40}
        height={40}
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
    case "team":   return `/teams/${entity.id}`
    case "player": return `/players/${entity.id}`
    case "league": return `/leagues/${entity.id}`
    case "coach":  return `/coaches/${entity.id}`
    case "venue":  return `/venues/${entity.id}`
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const router     = useRouter()
  const [query, setQuery]     = useState("")
  const [apiData, setApiData] = useState<SearchResponse>({ entities: [], matches: [] })
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef   = useRef<HTMLInputElement>(null)
  const tilesRef   = useRef<HTMLDivElement>(null)
  const listRef    = useRef<HTMLUListElement>(null)
  const { matches: feedMatches } = useMatchIntelligence()
  const debouncedQuery = useDebounce(query, 350)

  // Load recent searches on mount
  useEffect(() => { setRecentSearches(loadRecent()) }, [])

  // Mouse drag-to-scroll on entity tiles
  useEffect(() => {
    const el = tilesRef.current
    if (!el) return
    let isDown = false, startX = 0, scrollLeft = 0, hasDragged = false

    const onMouseDown = (e: MouseEvent) => { isDown = true; hasDragged = false; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; el.style.cursor = "grabbing" }
    const onMouseLeave = () => { isDown = false; el.style.cursor = "grab" }
    const onMouseUp   = () => { isDown = false; el.style.cursor = "grab" }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const walk = e.pageX - el.offsetLeft - startX
      if (Math.abs(walk) > 4) hasDragged = true
      el.scrollLeft = scrollLeft - walk
    }
    const onClickCapture = (e: MouseEvent) => { if (hasDragged) { e.preventDefault(); e.stopPropagation(); hasDragged = false } }

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

  // Focus input on open
  useEffect(() => { inputRef.current?.focus() }, [])

  // Global API search
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 3) { setApiData({ entities: [], matches: [] }); setLoading(false); return }

    setLoading(true)
    const ctrl = new AbortController()
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: SearchResponse) => { setApiData(data); setLoading(false) })
      .catch((err) => { if (err?.name !== "AbortError") setLoading(false) })
    return () => ctrl.abort()
  }, [debouncedQuery])

  // Reset active index when results change
  useEffect(() => { setActiveIdx(-1) }, [debouncedQuery])

  // Build results
  const q = query.trim().toLowerCase()

  const entityTeamIds = new Set(
    apiData.entities.filter((e) => e.type === "team").map((e) => e.id)
  )

  const localMatches = q.length >= 2
    ? feedMatches.filter((m) =>
        m.home.name.toLowerCase().includes(q) ||
        m.away.name.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q) ||
        (m.home.id != null && entityTeamIds.has(m.home.id)) ||
        (m.away.id != null && entityTeamIds.has(m.away.id))
      )
    : []

  const localIds = new Set(localMatches.map((m) => m.id))
  const apiOnly  = apiData.matches.filter((m) => !localIds.has(m.id))

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

  const results  = [...rank(localMatches), ...rank(apiOnly)].slice(0, 15)
  const entities = apiData.entities

  const hasQuery  = q.length >= 2
  const showEmpty = hasQuery && !loading && results.length === 0 && entities.length === 0
  const showRecent = !hasQuery && recentSearches.length > 0

  // Total navigable items: match results only (entities are horizontal, skip them)
  const totalItems = results.length

  // Navigate to selected result
  const navigateToActive = useCallback((idx: number) => {
    if (idx < 0 || idx >= results.length) return
    const m = results[idx]
    saveRecent(query.trim())
    setRecentSearches(loadRecent())
    router.push(`/match/${m.id}`)
    onClose()
  }, [results, query, router, onClose])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { onClose(); return }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => {
        const next = Math.min(i + 1, totalItems - 1)
        scrollItemIntoView(next)
        return next
      })
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => {
        const prev = Math.max(i - 1, 0)
        scrollItemIntoView(prev)
        return prev
      })
      return
    }

    if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < results.length) {
        navigateToActive(activeIdx)
      } else if (entities.length > 0) {
        saveRecent(query.trim())
        setRecentSearches(loadRecent())
        router.push(entityHref(entities[0]))
        onClose()
      } else if (results[0]) {
        navigateToActive(0)
      }
    }
  }

  function scrollItemIntoView(idx: number) {
    const list = listRef.current
    if (!list) return
    const item = list.children[entities.length > 0 ? idx + 1 : idx] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }

  const handleMatchClick = (m: Match) => {
    if (query.trim().length >= 2) {
      saveRecent(query.trim())
      setRecentSearches(loadRecent())
    }
    router.push(`/match/${m.id}`)
    onClose()
  }

  // Status message for screen readers
  const statusMsg = !hasQuery ? "" : loading ? "Searching…" : showEmpty
    ? `No results found for ${query.trim()}`
    : entities.length > 0 || results.length > 0
      ? `${results.length} match${results.length !== 1 ? "es" : ""} and ${entities.length} entit${entities.length !== 1 ? "ies" : "y"} found`
      : ""

  return (
    <div className="gs-backdrop" onClick={onClose} role="presentation">
      <div
        className="gs-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="gs-input-row">
          {loading ? (
            <span className="gs-spinner" aria-hidden />
          ) : (
            <svg className="gs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
          <input
            ref={inputRef}
            id="gs-search-input"
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            className="gs-input"
            placeholder="Search any team, player, league…"
            aria-label="Search teams, players, leagues, coaches and venues"
            aria-busy={loading}
            aria-controls="gs-results-list"
            aria-activedescendant={activeIdx >= 0 ? `gs-result-${activeIdx}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button type="button" className="gs-clear-btn" onClick={() => { setQuery(""); setActiveIdx(-1) }} aria-label="Clear search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <button type="button" className="gs-close-btn" onClick={onClose} aria-label="Close search">Esc</button>
        </div>

        {/* Screen reader live region */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">{statusMsg}</p>

        {/* Recent searches — shown when input is empty */}
        {showRecent && (
          <div className="gs-recent-wrap">
            <div className="gs-recent-header">
              <span className="gs-section-label">Recent searches</span>
              <button
                type="button"
                className="gs-recent-clear-all"
                onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]) }}
              >
                Clear all
              </button>
            </div>
            <div className="gs-recent-list">
              {recentSearches.map((rs) => (
                <div key={rs} className="gs-recent-item">
                  <button
                    type="button"
                    className="gs-recent-query"
                    onClick={() => setQuery(rs)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ opacity: 0.5, flexShrink: 0 }}>
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    {rs}
                  </button>
                  <button
                    type="button"
                    className="gs-recent-remove"
                    aria-label={`Remove ${rs} from recent searches`}
                    onClick={() => { removeRecent(rs); setRecentSearches(loadRecent()) }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entity tiles */}
        {hasQuery && entities.length > 0 && (
          <div className="gs-entities-section" aria-label="People and teams">
            <div className="gs-entities-scroll" ref={tilesRef}>
              {entities.map((entity) => (
                <Link
                  key={`${entity.type}-${entity.id}`}
                  href={entityHref(entity)}
                  className="gs-entity-tile"
                  onClick={() => {
                    saveRecent(query.trim())
                    setRecentSearches(loadRecent())
                    onClose()
                  }}
                >
                  <div className="gs-entity-img-wrap">
                    <EntityImage image={entity.image} name={entity.name} type={entity.type} />
                    <span className={cn("gs-entity-type-badge", `gs-entity-type-badge--${entity.type}`)} aria-hidden="true">
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

        {/* Match results */}
        {hasQuery && results.length > 0 && (
          <ul
            id="gs-results-list"
            ref={listRef}
            className="gs-results"
            aria-label="Match results"
            role="listbox"
          >
            {entities.length > 0 && (
              <li aria-hidden="true"><p className="gs-section-label">Matches</p></li>
            )}
            {results.map((m, idx) => (
              <li key={m.id} role="option" aria-selected={activeIdx === idx} id={`gs-result-${idx}`}>
                <button
                  type="button"
                  className={cn("gs-result-item", activeIdx === idx && "gs-result-item--active")}
                  onClick={() => handleMatchClick(m)}
                  onMouseEnter={() => setActiveIdx(idx)}
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
        )}

        {/* Footer hint */}
        <p className="gs-footer-hint" aria-hidden="true">
          {!hasQuery && recentSearches.length === 0 && "Search teams, players, leagues, coaches and venues"}
          {hasQuery && loading && "Searching…"}
          {showEmpty && `No results for "${query.trim()}"`}
          {hasQuery && !loading && (entities.length > 0 || results.length > 0) &&
            `${results.length} match${results.length !== 1 ? "es" : ""} · ${entities.length} entit${entities.length !== 1 ? "ies" : "y"} · ↑↓ navigate · Enter to open`}
        </p>
      </div>
    </div>
  )
}
