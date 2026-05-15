"use client"

import { useFilters } from "@/contexts/FilterContext"

export function ActiveFilterChips() {
  const {
    statusFilter, setStatusFilter,
    disabledLeagues, clearDisabledLeagues,
    activeFilterCount,
  } = useFilters()

  if (activeFilterCount === 0) return null

  return (
    <div className="cc-filter-chips" role="region" aria-label="Active filters">
      {statusFilter !== "all" && (
        <button
          type="button"
          className="cc-filter-chip"
          onClick={() => setStatusFilter("all")}
          aria-label={`Remove ${statusFilter} filter`}
        >
          {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} ×
        </button>
      )}

      {disabledLeagues.size > 0 && (
        <button
          type="button"
          className="cc-filter-chip"
          onClick={clearDisabledLeagues}
          aria-label="Show all leagues"
        >
          {disabledLeagues.size === 1 ? "1 league hidden" : `${disabledLeagues.size} leagues hidden`} ×
        </button>
      )}
    </div>
  )
}
