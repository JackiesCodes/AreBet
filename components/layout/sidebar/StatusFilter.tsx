"use client"

import { cn } from "@/lib/utils/cn"
import type { GlobalStatusFilter } from "@/contexts/FilterContext"

const STATUS_OPTIONS: { key: GlobalStatusFilter; label: string }[] = [
  { key: "all",      label: "All Matches" },
  { key: "live",     label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
]

interface StatusFilterProps {
  statusFilter: GlobalStatusFilter
  statusCounts: Record<GlobalStatusFilter, number>
  setStatusFilter: (s: GlobalStatusFilter) => void
}

export function StatusFilter({ statusFilter, statusCounts, setStatusFilter }: StatusFilterProps) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">Match Status</div>
      {STATUS_OPTIONS.map(({ key, label }) => {
        const count = statusCounts[key]
        return (
          <button
            key={key}
            type="button"
            className={cn("sidebar-status-btn", statusFilter === key && "sidebar-status-btn--active")}
            onClick={() => setStatusFilter(key)}
          >
            <span>{label}</span>
            {key !== "all" && count > 0 && (
              <span className={cn(
                "sidebar-status-badge",
                key === "live"     && "sidebar-status-badge--live",
                key === "upcoming" && "sidebar-status-badge--upcoming",
                key === "finished" && "sidebar-status-badge--finished",
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
