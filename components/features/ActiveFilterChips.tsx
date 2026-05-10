"use client"

import { useFilters, KICKOFF_LABELS } from "@/contexts/FilterContext"

export function ActiveFilterChips() {
  const {
    statusFilter, setStatusFilter,
    kickoffFilter, setKickoffFilter,
    disabledLeagues, clearDisabledLeagues,
    valueOnly, setValueOnly,
    minConfidence, setMinConfidence,
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

      {kickoffFilter !== "all" && (
        <button
          type="button"
          className="cc-filter-chip"
          onClick={() => setKickoffFilter("all")}
          aria-label={`Remove ${KICKOFF_LABELS[kickoffFilter]} kickoff filter`}
        >
          {KICKOFF_LABELS[kickoffFilter]} ×
        </button>
      )}

      {valueOnly && (
        <button
          type="button"
          className="cc-filter-chip"
          onClick={() => setValueOnly(false)}
          aria-label="Remove value bets filter"
        >
          Value bets ×
        </button>
      )}

      {minConfidence > 0 && (
        <button
          type="button"
          className="cc-filter-chip"
          onClick={() => setMinConfidence(0)}
          aria-label="Remove confidence filter"
        >
          Conf ≥{minConfidence}% ×
        </button>
      )}
    </div>
  )
}
