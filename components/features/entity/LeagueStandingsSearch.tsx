"use client"

import { useState, useMemo } from "react"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import type { ApiStandingResponse } from "@/lib/api-football/types"

interface LeagueOption {
  id: number
  name: string
  country: string
}

function descriptionColor(desc: string | null): string {
  if (!desc) return "var(--text-muted)"
  const d = desc.toLowerCase()
  if (d.includes("champions league")) return "var(--primary)"
  if (d.includes("europa")) return "var(--warning)"
  if (d.includes("relegat")) return "var(--negative)"
  if (d.includes("conference")) return "#9333ea"
  return "var(--text-muted)"
}

function StandingsTable({ rows }: { rows: ApiStandingResponse["league"]["standings"][0] }) {
  return (
    <div className="md-table-wrap">
      <table className="md-table">
        <thead>
          <tr>
            <th style={{ width: 28 }}>#</th>
            <th>Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Goal Difference">GD</th>
            <th title="Points">Pts</th>
            <th title="Last 5 form" style={{ minWidth: 60 }}>Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team.id}>
              <td>
                <span
                  style={{
                    display: "inline-block",
                    width: 4,
                    height: 28,
                    borderRadius: 2,
                    background: descriptionColor(row.description),
                    verticalAlign: "middle",
                    marginRight: 6,
                  }}
                  title={row.description ?? undefined}
                  aria-label={row.description ?? undefined}
                />
                {row.rank}
              </td>
              <td style={{ fontWeight: 500 }}>{row.team.name}</td>
              <td>{row.all.played}</td>
              <td>{row.all.win}</td>
              <td>{row.all.draw}</td>
              <td>{row.all.lose}</td>
              <td>{row.all.goals.for}</td>
              <td>{row.all.goals.against}</td>
              <td style={{ color: row.goalsDiff > 0 ? "var(--positive)" : row.goalsDiff < 0 ? "var(--negative)" : "var(--text-muted)" }}>
                {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
              </td>
              <td><strong>{row.points}</strong></td>
              <td>
                <span className="standings-form" aria-label={`Recent form: ${row.form}`}>
                  {row.form.split("").map((c, i) => (
                    <span
                      key={i}
                      className={`standings-form-dot standings-form-dot--${c === "W" ? "w" : c === "D" ? "d" : "l"}`}
                      title={c === "W" ? "Win" : c === "D" ? "Draw" : "Loss"}
                    />
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LeagueStandingsSearch() {
  const { matches } = useMatchIntelligence()
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<LeagueOption | null>(null)
  const [standingsData, setStandingsData] = useState<ApiStandingResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  // Extract unique leagues from feed matches
  const leagueOptions = useMemo<LeagueOption[]>(() => {
    const seen = new Map<number, LeagueOption>()
    for (const m of matches) {
      if (m.leagueId && !seen.has(m.leagueId)) {
        seen.set(m.leagueId, { id: m.leagueId, name: m.league, country: m.country })
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [matches])

  const filtered = useMemo(() => {
    if (!search.trim()) return leagueOptions
    const q = search.toLowerCase()
    return leagueOptions.filter(
      (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q),
    )
  }, [leagueOptions, search])

  async function fetchLeague(league: LeagueOption) {
    setSelected(league)
    setOpen(false)
    setSearch("")
    setError(null)
    setStandingsData(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/standings?league=${league.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load standings")
      const list: ApiStandingResponse[] = json.standings ?? []
      setStandingsData(list[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (leagueOptions.length === 0) return null

  const leagueData = standingsData?.league
  const group = leagueData?.standings[0] ?? []

  return (
    <div className="lss-root">
      <h3 className="lss-heading">Look up any league</h3>
      <p className="lss-subtitle">
        {leagueOptions.length} league{leagueOptions.length !== 1 ? "s" : ""} seen in today's feed
      </p>

      <div className="lss-picker">
        <div className="lss-select-wrap">
          <button
            className="lss-select-btn"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {selected ? (
              <span>{selected.name} <span className="lss-country">({selected.country})</span></span>
            ) : (
              <span className="lss-placeholder">Search leagues…</span>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="lss-dropdown">
              <input
                className="lss-search-input"
                placeholder="Filter by name or country…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <div className="lss-dropdown-list">
                {filtered.length === 0 ? (
                  <div className="lss-dropdown-empty">No leagues found</div>
                ) : (
                  filtered.map((l) => (
                    <button
                      key={l.id}
                      className="lss-dropdown-item"
                      type="button"
                      onClick={() => fetchLeague(l)}
                    >
                      <span className="lss-dropdown-name">{l.name}</span>
                      <span className="lss-dropdown-country">{l.country}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="lss-loading">
          <span className="btn-spinner" aria-hidden />
          Loading standings…
        </div>
      )}

      {error && (
        <div className="admin-warn-box" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {!loading && leagueData && group.length > 0 && (
        <section className="md-card lss-result" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {leagueData.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={leagueData.logo} alt={leagueData.name} width={20} height={20} style={{ objectFit: "contain" }} />
            )}
            <strong style={{ fontSize: 14 }}>{leagueData.name}</strong>
            <span className="md-text-muted" style={{ fontSize: 11 }}>
              {leagueData.country} · {leagueData.season}/{(leagueData.season + 1).toString().slice(2)}
            </span>
          </div>
          <StandingsTable rows={group} />
        </section>
      )}

      {!loading && standingsData !== null && group.length === 0 && (
        <p className="md-text-muted" style={{ marginTop: 12, fontSize: 13 }}>
          No standings available for this league.
        </p>
      )}
    </div>
  )
}
