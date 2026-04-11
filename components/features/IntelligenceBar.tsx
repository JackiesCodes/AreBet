"use client"

import { useMemo } from "react"
import type { Match } from "@/types/match"
import { calculateValueEdge } from "@/lib/utils/value-bet"

interface IntelligenceBarProps {
  matches: Match[]
  fetchedAt?: string
}

export function IntelligenceBar({ matches, fetchedAt }: IntelligenceBarProps) {
  const stats = useMemo(() => {
    const live = matches.filter((m) => m.status === "LIVE")
    const upcoming = matches.filter((m) => m.status === "UPCOMING")
    const highConf = matches.filter((m) => (m.prediction?.confidence ?? 0) >= 72)
    const valueSpots = matches.filter((m) => calculateValueEdge(m)?.isValue === true)
    const inNextHour = upcoming.filter((m) => {
      const ms = new Date(m.kickoffISO).getTime() - Date.now()
      return ms > 0 && ms < 60 * 60 * 1000
    })
    return { live, upcoming, highConf, valueSpots, inNextHour }
  }, [matches])

  const lastUpdated = useMemo(() => {
    if (!fetchedAt) return null
    const diff = Math.round((Date.now() - new Date(fetchedAt).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    return `${Math.round(diff / 60)}m ago`
  }, [fetchedAt])

  if (matches.length === 0) return null

  return (
    <div className="intel-bar" role="region" aria-label="Today's intelligence summary">
      <div className="intel-bar-inner">
        {stats.live.length > 0 && (
          <div className="intel-stat intel-stat--live">
            <span className="intel-live-dot" aria-hidden />
            <span className="intel-stat-value">{stats.live.length}</span>
            <span className="intel-stat-label">live now</span>
          </div>
        )}

        {stats.inNextHour.length > 0 && (
          <div className="intel-stat">
            <span className="intel-stat-value">{stats.inNextHour.length}</span>
            <span className="intel-stat-label">kicking off soon</span>
          </div>
        )}

        {stats.valueSpots.length > 0 && (
          <div className="intel-stat intel-stat--value">
            <span className="intel-stat-icon" aria-hidden>▲</span>
            <span className="intel-stat-value">{stats.valueSpots.length}</span>
            <span className="intel-stat-label">value {stats.valueSpots.length === 1 ? "spot" : "spots"}</span>
          </div>
        )}

        {stats.highConf.length > 0 && (
          <div className="intel-stat intel-stat--conf">
            <span className="intel-stat-icon" aria-hidden>✦</span>
            <span className="intel-stat-value">{stats.highConf.length}</span>
            <span className="intel-stat-label">high confidence</span>
          </div>
        )}

        <div className="intel-stat intel-stat--total">
          <span className="intel-stat-value">{matches.length}</span>
          <span className="intel-stat-label">matches today</span>
        </div>

        {lastUpdated && (
          <div className="intel-updated" aria-live="polite">
            Updated {lastUpdated}
          </div>
        )}
      </div>
    </div>
  )
}
