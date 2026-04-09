"use client"

import { useMatchFeed } from "@/hooks/useMatchFeed"
import { PageHeader } from "@/components/layout/PageHeader"
import { Skeleton } from "@/components/primitives/Skeleton"
import { useMemo } from "react"

interface Standing {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
}

export default function StandingsPage() {
  const { matches, loading } = useMatchFeed()

  const tableByLeague = useMemo(() => {
    const map = new Map<string, Map<string, Standing>>()
    for (const m of matches.filter((x) => x.status === "FINISHED")) {
      if (!map.has(m.league)) map.set(m.league, new Map())
      const table = map.get(m.league)!
      const home = table.get(m.home.name) ?? blank(m.home.name)
      const away = table.get(m.away.name) ?? blank(m.away.name)
      home.played += 1
      away.played += 1
      home.gf += m.score.home
      home.ga += m.score.away
      away.gf += m.score.away
      away.ga += m.score.home
      if (m.score.home > m.score.away) {
        home.won += 1
        home.points += 3
        away.lost += 1
      } else if (m.score.home < m.score.away) {
        away.won += 1
        away.points += 3
        home.lost += 1
      } else {
        home.drawn += 1
        away.drawn += 1
        home.points += 1
        away.points += 1
      }
      table.set(m.home.name, home)
      table.set(m.away.name, away)
    }
    return map
  }, [matches])

  return (
    <div className="md-page">
      <PageHeader title="Standings" subtitle="Form-based standings from completed fixtures" />
      {loading && <Skeleton variant="grid" count={3} />}
      {Array.from(tableByLeague.entries()).map(([league, table]) => {
        const rows = Array.from(table.values()).sort((a, b) => b.points - a.points)
        return (
          <section key={league} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, marginBottom: 8 }}>{league}</h2>
            <table className="md-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.team}>
                    <td>{i + 1}</td>
                    <td>{r.team}</td>
                    <td>{r.played}</td>
                    <td>{r.won}</td>
                    <td>{r.drawn}</td>
                    <td>{r.lost}</td>
                    <td>{r.gf}</td>
                    <td>{r.ga}</td>
                    <td><strong>{r.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}

function blank(team: string): Standing {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
}
