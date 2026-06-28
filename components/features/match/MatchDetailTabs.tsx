"use client"

import { lazy, Suspense, useId, useRef, useState } from "react"
import type { Match } from "@/types/match"
import { cn } from "@/lib/utils/cn"
import { Skeleton } from "@/components/primitives/Skeleton"

// Lazy-load each tab for code splitting — only the active tab is bundled on demand
const MatchLineupTab   = lazy(() => import("./tabs/MatchLineupTab").then((m) => ({ default: m.MatchLineupTab })))
const MatchOverviewTab = lazy(() => import("./tabs/MatchOverviewTab").then((m) => ({ default: m.MatchOverviewTab })))
const MatchStatsTab    = lazy(() => import("./tabs/MatchStatsTab").then((m) => ({ default: m.MatchStatsTab })))
const MatchPlayersTab  = lazy(() => import("./tabs/MatchPlayersTab").then((m) => ({ default: m.MatchPlayersTab })))
const MatchTimelineTab = lazy(() => import("./tabs/MatchTimelineTab").then((m) => ({ default: m.MatchTimelineTab })))
const MatchH2HTab      = lazy(() => import("./tabs/MatchH2HTab").then((m) => ({ default: m.MatchH2HTab })))
const MatchOddsTab     = lazy(() => import("./tabs/MatchOddsTab").then((m) => ({ default: m.MatchOddsTab })))
const MatchSquadTab    = lazy(() => import("./tabs/MatchSquadTab").then((m) => ({ default: m.MatchSquadTab })))

type Tab = "overview" | "lineup" | "stats" | "players" | "timeline" | "h2h" | "odds" | "squad"

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "lineup",   label: "Lineup" },
  { key: "stats",    label: "Stats" },
  { key: "players",  label: "Players" },
  { key: "timeline", label: "Timeline" },
  { key: "h2h",      label: "H2H" },
  { key: "odds",     label: "Odds" },
  { key: "squad",    label: "Squad" },
]

const TAB_COMPONENTS: Record<Tab, React.ComponentType<{ match: Match }>> = {
  overview: MatchOverviewTab,
  lineup:   MatchLineupTab,
  stats:    MatchStatsTab,
  players:  MatchPlayersTab,
  timeline: MatchTimelineTab,
  h2h:      MatchH2HTab,
  odds:     MatchOddsTab,
  squad:    MatchSquadTab,
}

export function MatchDetailTabs({ match }: { match: Match }) {
  const [tab, setTab] = useState<Tab>("overview")
  const uid     = useId()
  const tabsRef = useRef<HTMLDivElement>(null)

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const tabs = tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    if (!tabs) return
    const count = tabs.length
    if (e.key === "ArrowRight") {
      e.preventDefault()
      const next = (index + 1) % count
      tabs[next].focus()
      setTab(TABS[next].key)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prev = (index - 1 + count) % count
      tabs[prev].focus()
      setTab(TABS[prev].key)
    } else if (e.key === "Home") {
      e.preventDefault()
      tabs[0].focus()
      setTab(TABS[0].key)
    } else if (e.key === "End") {
      e.preventDefault()
      tabs[count - 1].focus()
      setTab(TABS[count - 1].key)
    }
  }

  const tabId   = (key: Tab) => `${uid}-tab-${key}`
  const panelId = (key: Tab) => `${uid}-panel-${key}`
  const ActiveTab = TAB_COMPONENTS[tab]

  return (
    <div>
      <div className="md-tabs" role="tablist" aria-label="Match details" ref={tabsRef}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            id={tabId(t.key)}
            type="button"
            role="tab"
            className={cn("md-tab", tab === t.key && "md-tab--active")}
            aria-selected={tab === t.key}
            aria-controls={panelId(t.key)}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            onKeyDown={(e) => handleTabKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id={panelId(tab)}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        tabIndex={0}
        style={{ padding: "var(--space-5) 0" }}
      >
        <Suspense fallback={<Skeleton count={4} />}>
          <ActiveTab match={match} />
        </Suspense>
      </div>
    </div>
  )
}
