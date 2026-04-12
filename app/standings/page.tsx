import { fetchAllStandings } from "@/lib/api-football/client"
import { shouldUseDemoMode } from "@/lib/services/matches"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/primitives/EmptyState"
import type { ApiStandingRow } from "@/lib/api-football/types"

export const dynamic = "force-dynamic"
export const revalidate = 0

function descriptionColor(desc: string | null): string {
  if (!desc) return "var(--text-muted)"
  const d = desc.toLowerCase()
  if (d.includes("champions league")) return "var(--primary)"
  if (d.includes("europa")) return "var(--warning)"
  if (d.includes("relegat")) return "var(--negative)"
  if (d.includes("conference")) return "#9333ea"
  return "var(--text-muted)"
}

function StandingsTable({ rows }: { rows: ApiStandingRow[] }) {
  return (
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
  )
}

export default async function StandingsPage() {
  const isDemo = shouldUseDemoMode()

  if (isDemo) {
    return (
      <div className="md-page">
        <PageHeader title="Standings" subtitle="Live league tables from API-Football" />
        <EmptyState
          title="Live mode required"
          text="Standings use real API data. Set NEXT_PUBLIC_USE_DEMO_DATA=false and add your API_FOOTBALL_KEY to enable."
        />
      </div>
    )
  }

  let standingsData: Awaited<ReturnType<typeof fetchAllStandings>> = []
  let fetchError: string | null = null

  try {
    standingsData = await fetchAllStandings()
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error"
  }

  const hasData = standingsData.length > 0

  return (
    <div className="md-page">
      <PageHeader
        title="Standings"
        subtitle={hasData ? `${standingsData.length} league${standingsData.length !== 1 ? "s" : ""} · updated every 6 hours` : "Live league tables from API-Football"}
      />

      {fetchError && (
        <div className="admin-warn-box" style={{ marginBottom: 16 }}>
          Could not load standings: {fetchError}
        </div>
      )}

      {!fetchError && !hasData && (
        <EmptyState
          title="No standings available"
          text="Standings data is unavailable for the current season. Try again later."
        />
      )}

      {standingsData.map((item) => {
        const league = item.league
        const group = league.standings[0] ?? []
        if (group.length === 0) return null
        return (
          <section key={league.id} className="md-card" style={{ marginBottom: 16, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              {league.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={league.logo} alt={league.name} width={20} height={20} style={{ objectFit: "contain" }} />
              )}
              <strong style={{ fontSize: 14 }}>{league.name}</strong>
              <span className="md-text-muted" style={{ fontSize: 11 }}>{league.country} · {league.season}/{(league.season + 1).toString().slice(2)}</span>
            </div>
            <StandingsTable rows={group} />

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              {[
                { color: "var(--primary)", label: "Champions League" },
                { color: "var(--warning)", label: "Europa League" },
                { color: "#9333ea", label: "Conference League" },
                { color: "var(--negative)", label: "Relegation" },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
                  <span style={{ width: 4, height: 12, borderRadius: 2, background: color, display: "inline-block" }} />
                  {label}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
