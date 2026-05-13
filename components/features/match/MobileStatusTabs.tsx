"use client"

import { cn } from "@/lib/utils/cn"
import type { GlobalStatusFilter } from "@/contexts/FilterContext"

const STATUS_TABS: { key: GlobalStatusFilter; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "live",     label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
]

interface MobileStatusTabsProps {
  counts: Record<GlobalStatusFilter, number>
  active: GlobalStatusFilter
  onChange: (s: GlobalStatusFilter) => void
}

export function MobileStatusTabs({ counts, active, onChange }: MobileStatusTabsProps) {
  return (
    <div className="mob-status-tabs" role="tablist" aria-label="Match status filter">
      {STATUS_TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          className={cn("mob-status-tab", active === key && "mob-status-tab--active")}
          onClick={() => onChange(key)}
        >
          {label}
          {key === "live" && counts.live > 0 && (
            <span className="mob-status-tab-badge mob-status-tab-badge--live">{counts.live}</span>
          )}
          {key === "upcoming" && counts.upcoming > 0 && (
            <span className="mob-status-tab-badge">{counts.upcoming}</span>
          )}
        </button>
      ))}
    </div>
  )
}
