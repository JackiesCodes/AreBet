"use client"

import { useFilters } from "@/contexts/FilterContext"
import { useMatchFeedCtx } from "@/contexts/MatchFeedContext"
import { LEAGUE_POP } from "@/lib/utils/league-groups"
import { leagueKey } from "@/contexts/FilterContext"
import { cn } from "@/lib/utils/cn"

// League IDs with LEAGUE_POP score >= 90 (top tier competitions)
const TOP_LEAGUE_IDS = new Set(
  Object.entries(LEAGUE_POP)
    .filter(([, pop]) => pop >= 90)
    .map(([id]) => Number(id)),
)

interface Preset {
  key: string
  label: string
  isActive: (ctx: ReturnType<typeof useFilters>, allLeagueKeys: string[]) => boolean
  apply: (ctx: ReturnType<typeof useFilters>, allLeagueKeys: string[]) => void
}

const PRESETS: Preset[] = [
  {
    key: "live",
    label: "🔴 Live",
    isActive: (ctx) => ctx.statusFilter === "live" && ctx.activeFilterCount === 1,
    apply: (ctx) => { ctx.resetFilters(); ctx.setStatusFilter("live") },
  },
  {
    key: "top-leagues",
    label: "⚽ Top Leagues",
    isActive: (ctx, allKeys) => {
      const nonTop = allKeys.filter((k) => !TOP_LEAGUE_IDS.has(Number(k)))
      return nonTop.length > 0 &&
        nonTop.every((k) => ctx.disabledLeagues.has(k)) &&
        ctx.disabledLeagues.size === nonTop.length
    },
    apply: (ctx, allKeys) => {
      const topKeys = allKeys.filter((k) => TOP_LEAGUE_IDS.has(Number(k)))
      ctx.resetFilters()
      ctx.isolateLeagues(topKeys, allKeys)
    },
  },
]

export function FilterPresetButtons() {
  const ctx = useFilters()
  const { matches } = useMatchFeedCtx()

  const allLeagueKeys = [...new Set(matches.map((m) => leagueKey(m)))]

  return (
    <div className="sidebar-presets">
      {PRESETS.map((preset) => {
        const active = preset.isActive(ctx, allLeagueKeys)
        return (
          <button
            key={preset.key}
            type="button"
            className={cn("sidebar-preset-pill", active && "sidebar-preset-pill--active")}
            onClick={() => active ? ctx.resetFilters() : preset.apply(ctx, allLeagueKeys)}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
