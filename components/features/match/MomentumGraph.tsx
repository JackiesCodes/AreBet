"use client"

import type { MatchEvent } from "@/types/match"

interface MomentumGraphProps {
  events: MatchEvent[]
  homeTeam: string
  awayTeam: string
}

// Weight per event type
const EVENT_WEIGHT: Record<string, number> = {
  goal: 3,
  card: 1,
  sub: 0.5,
}

const WINDOWS = [
  { label: "0–15", min: 0, max: 15 },
  { label: "15–30", min: 15, max: 30 },
  { label: "30–45", min: 30, max: 45 },
  { label: "45–60", min: 45, max: 60 },
  { label: "60–75", min: 60, max: 75 },
  { label: "75–90", min: 75, max: 90 },
  { label: "90+", min: 90, max: Infinity },
]

interface WindowData {
  label: string
  home: number
  away: number
}

function buildWindows(events: MatchEvent[]): WindowData[] {
  return WINDOWS.map((w) => {
    const inWindow = events.filter((e) => e.minute > w.min && e.minute <= (w.max === Infinity ? 999 : w.max))
    const home = inWindow
      .filter((e) => e.team === "home")
      .reduce((sum, e) => sum + (EVENT_WEIGHT[e.type] ?? 0.5), 0)
    const away = inWindow
      .filter((e) => e.team === "away")
      .reduce((sum, e) => sum + (EVENT_WEIGHT[e.type] ?? 0.5), 0)
    return { label: w.label, home, away }
  })
}

export function MomentumGraph({ events, homeTeam, awayTeam }: MomentumGraphProps) {
  const windows = buildWindows(events)
  const maxVal = Math.max(...windows.flatMap((w) => [w.home, w.away]), 1)

  const hasAnyActivity = windows.some((w) => w.home > 0 || w.away > 0)

  return (
    <div className="momentum-root">
      <div className="momentum-legend">
        <span className="momentum-legend-item momentum-legend-item--home">{homeTeam}</span>
        <span className="momentum-legend-title">Momentum</span>
        <span className="momentum-legend-item momentum-legend-item--away">{awayTeam}</span>
      </div>

      {!hasAnyActivity ? (
        <p className="md-text-muted" style={{ textAlign: "center", fontSize: 13, padding: "16px 0" }}>
          No match events yet.
        </p>
      ) : (
        <div className="momentum-chart">
          {windows.map((w) => {
            const homeH = Math.round((w.home / maxVal) * 60)
            const awayH = Math.round((w.away / maxVal) * 60)
            return (
              <div key={w.label} className="momentum-col">
                <div className="momentum-bars">
                  <div
                    className="momentum-bar momentum-bar--home"
                    style={{ height: homeH || 2 }}
                    title={`${homeTeam}: ${w.home.toFixed(1)}`}
                  />
                  <div className="momentum-bars-gap" />
                  <div
                    className="momentum-bar momentum-bar--away"
                    style={{ height: awayH || 2 }}
                    title={`${awayTeam}: ${w.away.toFixed(1)}`}
                  />
                </div>
                <span className="momentum-label">{w.label}</span>
              </div>
            )
          })}
        </div>
      )}

      <p className="momentum-note">
        Based on match events — goals (×3), cards (×1), subs (×0.5) per 15-min window
      </p>
    </div>
  )
}
