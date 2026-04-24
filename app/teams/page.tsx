"use client"

import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { FavoritesSwitcher } from "@/components/features/FavoritesSwitcher"
import { useMemo, useState } from "react"
import { FormGuide } from "@/components/primitives/FormGuide"
import Link from "next/link"

export default function TeamsPage() {
  const { matches, loading } = useMatchIntelligence()
  const [search, setSearch] = useState("")

  const teams = useMemo(() => {
    const map = new Map<string, { id?: number; name: string; league: string; form: string }>()
    for (const m of matches) {
      if (!map.has(m.home.name)) map.set(m.home.name, { id: m.home.id, name: m.home.name, league: m.league, form: m.home.form })
      if (!map.has(m.away.name)) map.set(m.away.name, { id: m.away.id, name: m.away.name, league: m.league, form: m.away.form })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [matches])

  const filtered = useMemo(() => {
    if (!search.trim()) return teams
    const q = search.toLowerCase()
    return teams.filter((t) => t.name.toLowerCase().includes(q) || t.league.toLowerCase().includes(q))
  }, [teams, search])

  return (
    <div className="md-page">
      <PageHeader title="Teams" subtitle={`${teams.length} clubs across all leagues`} />
      {loading && <Skeleton variant="list" count={10} />}
      {!loading && teams.length === 0 && (
        <EmptyState
          title="No teams found"
          text="No upcoming or recent fixtures loaded. Check back when matches are scheduled."
        />
      )}
      {!loading && teams.length > 0 && (
        <input
          className="md-input"
          placeholder="Search teams or leagues…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
          aria-label="Search teams"
        />
      )}
      <div className="teams-grid">
        {filtered.map((t) => {
          return (
            <div key={t.name} className="md-card teams-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Link href={t.id ? `/teams/${t.id}` : "#"} className="teams-card-link">
                  <strong>{t.name}</strong>
                  <div className="md-text-muted" style={{ fontSize: 11 }}>{t.league}</div>
                  <div style={{ marginTop: 8 }}><FormGuide form={t.form} /></div>
                </Link>
                <FavoritesSwitcher type="team" id={t.name} label={t.name} meta={{ league: t.league }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
