"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import type { MatchChange, ChangeSeverity } from "@/types/alerts"
import { CHANGE_ICONS, relativeTime } from "@/lib/utils/match-changes"
import { cn } from "@/lib/utils/cn"

interface AlertCenterProps {
  open: boolean
  onClose: () => void
}

const SEVERITY_ORDER: ChangeSeverity[] = ["critical", "high", "medium", "low"]

function severityLabel(s: ChangeSeverity) {
  switch (s) {
    case "critical": return "🔴 Now"
    case "high":     return "🟠 Important"
    case "medium":   return "🟡 Notable"
    case "low":      return "⬜ Low"
  }
}

function AlertRow({ change, onRead }: { change: MatchChange; onRead: (id: string) => void }) {
  return (
    <Link
      href={`/match/${change.matchId}`}
      className={cn("alert-row", !change.read && "alert-row--unread", `alert-row--${change.severity}`)}
      onClick={() => onRead(change.id)}
    >
      <span className="alert-row-icon" aria-hidden>{CHANGE_ICONS[change.type]}</span>
      <div className="alert-row-body">
        <div className="alert-row-summary">{change.summary}</div>
        <div className="alert-row-match">
          {change.matchLabel}
          {change.watchedMatch && <span className="alert-row-watched" aria-label="Watched match">♥</span>}
        </div>
        {change.detail && <div className="alert-row-detail">{change.detail}</div>}
      </div>
      <span className="alert-row-time">{relativeTime(change.ts)}</span>
    </Link>
  )
}

export function AlertCenter({ open, onClose }: AlertCenterProps) {
  const { changes, unreadCount, markRead, markAllRead, clearAll } = useMatchIntelligence()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Group changes by severity
  const grouped = SEVERITY_ORDER
    .map((sev) => ({
      severity: sev,
      items: changes.filter((c) => c.severity === sev),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div
      ref={panelRef}
      className={cn("alert-center", open && "alert-center--open")}
      aria-label="Match alerts"
      aria-hidden={!open}
      role="dialog"
    >
      {/* Mobile drag handle — visual affordance for the bottom sheet */}
      <div className="alert-center-handle" aria-hidden />

      <div className="alert-center-head">
        <div>
          <strong>Match Alerts</strong>
          {unreadCount > 0 && (
            <span className="alert-center-badge">{unreadCount} new</span>
          )}
        </div>
        <div className="alert-center-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="alert-center-action-btn"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )}
          {changes.length > 0 && (
            <button
              type="button"
              className="alert-center-action-btn"
              onClick={clearAll}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="alert-center-close"
            onClick={onClose}
            aria-label="Close alerts"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="alert-center-body">
        {changes.length === 0 ? (
          <div className="alert-center-empty">
            <div className="alert-center-empty-icon">🔔</div>
            <div className="alert-center-empty-title">No alerts yet</div>
            <div className="alert-center-empty-text">
              Goals, value spots, odds moves, and live starts will appear here.
            </div>
          </div>
        ) : (
          grouped.map(({ severity, items }) => (
            <div key={severity} className="alert-group">
              <div className="alert-group-label">{severityLabel(severity)}</div>
              {items.map((c) => (
                <AlertRow key={c.id} change={c} onRead={markRead} />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="alert-center-foot">
        <Link
          href="/favorites"
          className="alert-center-foot-link"
          onClick={onClose}
        >
          Manage watchlist →
        </Link>
      </div>
    </div>
  )
}
