"use client"

import { useEffect, useState } from "react"
import type { ApiPlayerStat } from "@/lib/api-football/types"
import { Skeleton } from "@/components/primitives/Skeleton"

interface LeagueTopScorersProps {
  leagueId: number
  leagueName: string
}

export function LeagueTopScorers({ leagueId, leagueName }: LeagueTopScorersProps) {
  const [players, setPlayers] = useState<ApiPlayerStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPlayers([])

    fetch(`/api/players/topscorers?league=${leagueId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setPlayers((d.topScorers as ApiPlayerStat[])?.slice(0, 8) ?? [])
      })
      .catch(() => { if (!cancelled) setPlayers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [leagueId])

  return (
    <div>
      <div className="rp-section-title">Top Scorers — {leagueName}</div>

      {loading && <Skeleton count={4} />}

      {!loading && players.length === 0 && (
        <div className="rp-empty">No scorer data available</div>
      )}

      {!loading && players.map((p, i) => {
        const stats = p.statistics[0]
        const goals = stats?.goals.total ?? 0
        const assists = stats?.goals.assists ?? 0
        const teamName = stats?.team.name ?? ""

        return (
          <div key={p.player.id} className="rp-scorer-row">
            <span className="rp-scorer-rank">{i + 1}</span>
            <div className="rp-scorer-info">
              <span className="rp-scorer-name">{p.player.name}</span>
              <span className="rp-scorer-team">{teamName}</span>
            </div>
            <div className="rp-scorer-stats">
              <span className="rp-scorer-goals" title="Goals">{goals}⚽</span>
              {assists > 0 && (
                <span className="rp-scorer-assists" title="Assists">{assists}🅰️</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
