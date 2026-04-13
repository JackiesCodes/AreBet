"use client"

import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/primitives/Skeleton"
import { EmptyState } from "@/components/primitives/EmptyState"
import { FavoritesSwitcher } from "@/components/features/FavoritesSwitcher"
import { useMemo } from "react"
import { FormGuide } from "@/components/primitives/FormGuide"

export default function TeamsPage() {
  const { matches, loading } = useMatchIntelligence()

  const teams = useMemo(() => {
    const map = new Map<string, { name: string; league: string; form: string }>()
    for (const m of matches) {
      if (!map.has(m.home.name)) map.set(m.home.name, { name: m.home.name, league: m.league, form: m.home.form })
      if (!map.has(m.away.name)) map.set(m.away.name, { name: m.away.name, league: m.league, form: m.away.form })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [matches])

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
      <div className="teams-grid">
        {teams.map((t) => (
          <div key={t.name} className="md-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong>{t.name}</strong>
                <div className="md-text-muted" style={{ fontSize: 11 }}>{t.league}</div>
                <div style={{ marginTop: 8 }}><FormGuide form={t.form} /></div>
              </div>
              <FavoritesSwitcher type="team" id={t.name} label={t.name} meta={{ league: t.league }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
