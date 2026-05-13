"use client"

import { useState, type ReactNode } from "react"
import { LeftSidebar } from "./LeftSidebar"
import { RightPanel } from "./RightPanel"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [insightsOpen, setInsightsOpen] = useState(false)

  return (
    <div className="app-shell">
      <LeftSidebar />
      <div className="app-main">
        {/* Tablet-only "Insights" trigger — hidden on desktop (≥1200px) */}
        <button
          type="button"
          className="app-insights-trigger"
          onClick={() => setInsightsOpen(true)}
          aria-expanded={insightsOpen}
          aria-controls="app-insights-drawer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Insights
        </button>
        {children}
      </div>

      {/* Desktop: always visible sidebar */}
      <div className="app-right-desktop">
        <RightPanel />
      </div>

      {/* Tablet drawer */}
      {insightsOpen && (
        <div
          className="app-insights-backdrop"
          onClick={() => setInsightsOpen(false)}
          aria-hidden
        />
      )}
      <div
        id="app-insights-drawer"
        className={`app-insights-drawer${insightsOpen ? " app-insights-drawer--open" : ""}`}
        aria-label="Insights panel"
      >
        <button
          type="button"
          className="app-insights-close"
          onClick={() => setInsightsOpen(false)}
          aria-label="Close insights"
        >
          ×
        </button>
        <RightPanel />
      </div>
    </div>
  )
}
