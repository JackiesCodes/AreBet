"use client"

import { cn } from "@/lib/utils/cn"

const CONFIDENCE_OPTIONS = [0, 50, 60, 70, 80]

interface ConfidenceFilterProps {
  valueOnly: boolean
  setValueOnly: (v: boolean) => void
  minConfidence: number
  setMinConfidence: (v: number) => void
}

export function ConfidenceFilter({ valueOnly, setValueOnly, minConfidence, setMinConfidence }: ConfidenceFilterProps) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">Predictions</div>
      <button
        type="button"
        className={cn("sidebar-status-btn", valueOnly && "sidebar-status-btn--active")}
        onClick={() => setValueOnly(!valueOnly)}
      >
        💰 Value bets only
      </button>
      <div className="sidebar-section-label sidebar-section-label--sub">Min confidence</div>
      <div className="sidebar-conf-row">
        {CONFIDENCE_OPTIONS.map((val) => (
          <button
            key={val}
            type="button"
            className={cn("sidebar-conf-btn", minConfidence === val && "sidebar-conf-btn--active")}
            onClick={() => setMinConfidence(val)}
          >
            {val === 0 ? "Off" : `${val}%`}
          </button>
        ))}
      </div>
    </div>
  )
}
