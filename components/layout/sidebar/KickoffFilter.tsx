"use client"

import { cn } from "@/lib/utils/cn"
import { KICKOFF_LABELS, type KickoffFilter } from "@/contexts/FilterContext"

const KICKOFF_OPTIONS: KickoffFilter[] = ["all", "next2h", "today", "tonight", "tomorrow"]

interface KickoffFilterProps {
  kickoffFilter: KickoffFilter
  setKickoffFilter: (f: KickoffFilter) => void
}

export function KickoffFilter({ kickoffFilter, setKickoffFilter }: KickoffFilterProps) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">Kickoff Time</div>
      <div className="sidebar-kickoff-row">
        {KICKOFF_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={cn("sidebar-kickoff-btn", kickoffFilter === opt && "sidebar-kickoff-btn--active")}
            onClick={() => setKickoffFilter(opt)}
          >
            {KICKOFF_LABELS[opt]}
          </button>
        ))}
      </div>
    </div>
  )
}
