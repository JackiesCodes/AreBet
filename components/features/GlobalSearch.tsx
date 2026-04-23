"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { formatTime } from "@/lib/utils/time"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"

interface GlobalSearchProps {
  onClose: () => void
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function matchLabel(m: Match): string {
  if (m.status === "LIVE") return `${m.score.home}–${m.score.away} · LIVE`
  if (m.status === "FINISHED") return `${m.score.home}–${m.score.away} · FT`
  return formatTime(m.kickoffISO)
}

function TeamLogo({ logo, name }: { logo?: string; name: string }) {
  if (logo) {
    return (
      <Image
        src={logo}
        alt={name}
        width={16}
        height={16}
        unoptimized
        style={{ borderRadius: 2, objectFit: "contain" }}
      />
    )
  }
  return (
    <span className="gs-team-initial">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [apiMatches, setApiMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { matches: feedMatches } = useMatchIntelligence()
  const debouncedQuery = useDebounce(query, 350)

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
      setApiMatches([])
      setLoading(false)
      return
    }

    setLoading(true)
    const controller = new AbortController()

    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setApiMatches(data.matches ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [debouncedQuery])

  // Merge: local feed results (instant) + API results (from all dates)
  const q = query.trim().toLowerCase()

  const localMatches = q.length >= 2
    ? feedMatches.filter((m) =>
        m.home.name.toLowerCase().includes(q) ||
        m.away.name.toLowerCase().includes(q) ||
        m.league.toLowerCase().includes(q),
      )
    : []

  // Deduplicate: local feed takes priority (richer data), API fills in what's not in the feed
  const localIds = new Set(localMatches.map((m) => m.id))
  const apiOnly = apiMatches.filter((m) => !localIds.has(m.id))

  // Rank by: live first → name match quality × league popularity → date
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
    const ql = q.toLowerCase()
    const ns = Math.max(namePop(m.home.name, ql), namePop(m.away.name, ql), namePop(m.league, ql))
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

  const hasQuery = q.length >= 2
  const showEmpty = hasQuery && !loading && results.length === 0

  // Navigate to first result on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && results[0]) {
      router.push(`/match/${results[0].id}`)
      onClose()
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
            placeholder="Search any team, league, competition…"
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

        {/* Results */}
        {hasQuery && results.length > 0 && (
          <ul className="gs-results">
            {results.map((m) => (
              <li key={m.id}>
                <Link href={`/match/${m.id}`} className="gs-result-item" onClick={onClose}>
                  {/* Team logos / initials */}
                  <span className="gs-result-teams">
                    <TeamLogo logo={m.home.logo} name={m.home.name} />
                    <span className="gs-vs">v</span>
                    <TeamLogo logo={m.away.logo} name={m.away.name} />
                  </span>
                  {/* Match info */}
                  <span className="gs-result-body">
                    <span className="gs-result-title">
                      {m.home.name} vs {m.away.name}
                    </span>
                    <span className="gs-result-sub">
                      {m.league} · {m.country} · {matchLabel(m)}
                    </span>
                  </span>
                  {/* Status badge */}
                  {m.status === "LIVE" && (
                    <span className={cn("gs-status-badge", "gs-status-badge--live")}>LIVE</span>
                  )}
                  {m.status === "FINISHED" && (
                    <span className={cn("gs-status-badge", "gs-status-badge--ft")}>FT</span>
                  )}
                  {m.status === "UPCOMING" && (
                    <span className={cn("gs-status-badge", "gs-status-badge--upcoming")}>
                      {formatTime(m.kickoffISO)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Footer hint */}
        <p className="gs-footer-hint">
          {!hasQuery && "Search any team or league across all upcoming fixtures"}
          {hasQuery && loading && "Searching all fixtures…"}
          {showEmpty && `No matches found for "${query.trim()}"`}
          {hasQuery && !loading && results.length > 0 && `${results.length} result${results.length !== 1 ? "s" : ""} — press Enter to open first`}
        </p>
      </div>
    </div>
  )
}
