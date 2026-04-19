"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { formatTime } from "@/lib/utils/time"

interface GlobalSearchProps {
  onClose: () => void
}

interface Result {
  type: "match" | "team" | "league"
  id: string
  title: string
  subtitle: string
  href: string
  status?: string
}

const TYPE_ICON: Record<Result["type"], string> = {
  match: "⚽",
  team: "🏟",
  league: "🏆",
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const { matches } = useMatchIntelligence()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const matchResults: Result[] = []
    const teamSeen = new Set<string>()
    const leagueSeen = new Set<string>()
    const teamResults: Result[] = []
    const leagueResults: Result[] = []

    for (const m of matches) {
      const homeL = m.home.name.toLowerCase()
      const awayL = m.away.name.toLowerCase()
      const leagueL = m.league.toLowerCase()

      // Matches
      if (homeL.includes(q) || awayL.includes(q)) {
        const timeLabel =
          m.status === "LIVE"
            ? `${m.score.home}–${m.score.away} · LIVE`
            : m.status === "FINISHED"
              ? `${m.score.home}–${m.score.away} · FT`
              : formatTime(m.kickoffISO)
        matchResults.push({
          type: "match",
          id: String(m.id),
          title: `${m.home.name} vs ${m.away.name}`,
          subtitle: `${m.league} · ${timeLabel}`,
          href: `/match/${m.id}`,
          status: m.status,
        })
      }

      // Teams (deduplicated)
      for (const name of [m.home.name, m.away.name]) {
        if (name.toLowerCase().includes(q) && !teamSeen.has(name)) {
          teamSeen.add(name)
          teamResults.push({
            type: "team",
            id: `team-${name}`,
            title: name,
            subtitle: m.league,
            href: `/teams`,
          })
        }
      }

      // Leagues (deduplicated)
      if (leagueL.includes(q) && !leagueSeen.has(m.league)) {
        leagueSeen.add(m.league)
        const count = matches.filter((x) => x.league === m.league).length
        leagueResults.push({
          type: "league",
          id: `league-${m.league}`,
          title: m.league,
          subtitle: `${count} match${count !== 1 ? "es" : ""}`,
          href: `/`,
        })
      }
    }

    return [
      ...matchResults.slice(0, 6),
      ...teamResults.slice(0, 4),
      ...leagueResults.slice(0, 3),
    ]
  }, [query, matches])

  const q = query.trim()

  return (
    <div className="gs-backdrop" onClick={onClose}>
      <div className="gs-modal" onClick={(e) => e.stopPropagation()}>
        {/* Input row */}
        <div className="gs-input-row">
          <svg className="gs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
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
            placeholder="Teams, matches, leagues…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="gs-close-btn" onClick={onClose} aria-label="Close search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        {q.length >= 2 && results.length > 0 && (
          <ul className="gs-results">
            {results.map((r) => (
              <li key={r.id}>
                <Link href={r.href} className="gs-result-item" onClick={onClose}>
                  <span className="gs-result-icon" aria-hidden>{TYPE_ICON[r.type]}</span>
                  <span className="gs-result-body">
                    <span className="gs-result-title">{r.title}</span>
                    <span className="gs-result-sub">{r.subtitle}</span>
                  </span>
                  {r.status === "LIVE" && <span className="gs-live-badge">LIVE</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* States */}
        <p className="gs-footer-hint">
          {q.length === 0 && `${matches.length} matches, teams and leagues available`}
          {q.length === 1 && "Keep typing…"}
          {q.length >= 2 && results.length === 0 && `No results for "${q}"`}
        </p>
      </div>
    </div>
  )
}
