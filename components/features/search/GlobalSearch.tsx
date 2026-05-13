"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { useDebounce } from "@/hooks/useDebounce"
import type { Match } from "@/types/match"
import { LEAGUE_POP } from "@/lib/utils/league-groups"
import type { SearchEntity } from "@/app/api/search/route"
import { SearchInput } from "./SearchInput"
import { RecentSearches } from "./RecentSearches"
import { SearchEntityResults, entityHref } from "./SearchEntityResults"
import { SearchMatchResults } from "./SearchMatchResults"
import { useSearchKeyboard } from "./useSearchKeyboard"

interface GlobalSearchProps {
  onClose: (lastQuery: string) => void
  defaultQuery?: string
}

interface SearchResponse {
  entities: SearchEntity[]
  matches: Match[]
}

// ── Recent searches (localStorage) ─────────────────────────────────────────────
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
  localStorage.setItem(RECENT_KEY, JSON.stringify(loadRecent().filter((q) => q !== query)))
}

export function GlobalSearch({ onClose, defaultQuery = "" }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultQuery)
  const [apiData, setApiData] = useState<SearchResponse>({ entities: [], matches: [] })
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef  = useRef<HTMLInputElement>(null)
  const tilesRef  = useRef<HTMLDivElement>(null)
  const listRef   = useRef<HTMLUListElement>(null)
  const { matches: feedMatches } = useMatchIntelligence()
  const debouncedQuery = useDebounce(query, 350)

  // Load recent searches + focus input on mount
  useEffect(() => { setRecentSearches(loadRecent()) }, [])
  useEffect(() => { inputRef.current?.focus() }, [])

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

  // API search
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
  function matchScore(m: Match): number {
    const ns = Math.max(namePop(m.home.name, q), namePop(m.away.name, q), namePop(m.league, q))
    const lp = (m.leagueId ? LEAGUE_POP[m.leagueId] : 0) ?? 5
    return ns * 1000 + lp
  }
  function rank(arr: Match[]) {
    return [...arr].sort((a, b) => {
      const aLive = a.status === "LIVE" ? 1 : 0
      const bLive = b.status === "LIVE" ? 1 : 0
      if (aLive !== bLive) return bLive - aLive
      const sd = matchScore(b) - matchScore(a)
      if (sd !== 0) return sd
      return new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime()
    })
  }

  const results  = [...rank(localMatches), ...rank(apiOnly)].slice(0, 15)
  const entities = apiData.entities
  const hasQuery  = q.length >= 2
  const showEmpty = hasQuery && !loading && results.length === 0 && entities.length === 0

  // Helper to record a recent search and close the overlay
  const commitAndClose = (searchQuery: string) => {
    if (searchQuery.trim().length >= 2) {
      saveRecent(searchQuery.trim())
      setRecentSearches(loadRecent())
    }
    onClose(searchQuery)
  }

  const handleMatchSelect = (match: Match) => {
    commitAndClose(query)
    router.push(`/match/${match.id}`)
  }

  const handleEntitySelect = (entity: SearchEntity) => {
    commitAndClose(query)
    router.push(entityHref(entity))
  }

  const { activeIdx, setActiveIdx, handleKeyDown } = useSearchKeyboard({
    results,
    entities,
    query,
    onNavigate: (matchId) => {
      commitAndClose(query)
      router.push(`/match/${matchId}`)
    },
    onSelectEntity: handleEntitySelect,
    onClose: () => onClose(query),
    listRef,
    hasEntities: entities.length > 0,
  })

  const statusMsg = !hasQuery ? "" : loading ? "Searching…"
    : showEmpty ? `No results found for ${query.trim()}`
    : (entities.length > 0 || results.length > 0)
      ? `${results.length} match${results.length !== 1 ? "es" : ""} and ${entities.length} entit${entities.length !== 1 ? "ies" : "y"} found`
      : ""

  return (
    <div className="gs-backdrop" onClick={() => onClose(query)} role="presentation">
      <div
        className="gs-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
      >
        <SearchInput
          inputRef={inputRef}
          query={query}
          loading={loading}
          onQueryChange={setQuery}
          onKeyDown={handleKeyDown}
          onClear={() => { setQuery(""); setActiveIdx(-1) }}
          onClose={() => onClose(query)}
          activeIdx={activeIdx}
        />

        <p className="sr-only" aria-live="polite" aria-atomic="true">{statusMsg}</p>

        {!hasQuery && (
          <RecentSearches
            searches={recentSearches}
            onSelect={setQuery}
            onRemove={(rs) => { removeRecent(rs); setRecentSearches(loadRecent()) }}
            onClearAll={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]) }}
          />
        )}

        {hasQuery && (
          <SearchEntityResults
            entities={entities}
            tilesRef={tilesRef}
            onSelect={handleEntitySelect}
          />
        )}

        {hasQuery && (
          <SearchMatchResults
            results={results}
            activeIdx={activeIdx}
            query={query}
            hasEntities={entities.length > 0}
            listRef={listRef}
            onSelect={handleMatchSelect}
            onHover={setActiveIdx}
            showEmpty={showEmpty}
          />
        )}

        <p className="gs-footer-hint" aria-hidden="true">
          {!hasQuery && recentSearches.length === 0 && "Search teams, players, leagues, coaches and venues"}
          {hasQuery && loading && "Searching…"}
          {hasQuery && !loading && (entities.length > 0 || results.length > 0) &&
            `${results.length} match${results.length !== 1 ? "es" : ""} · ${entities.length} entit${entities.length !== 1 ? "ies" : "y"} · ↑↓ navigate · Enter to open`}
        </p>
      </div>
    </div>
  )
}
