"use client"

import { useEffect, useState } from "react"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { AlertCenter } from "./AlertCenter"
import { cn } from "@/lib/utils/cn"

export function AlertBell() {
  const { unreadCount } = useMatchIntelligence()
  const [open, setOpen] = useState(false)
  const hasAlerts = unreadCount > 0

  // Lock body scroll when panel is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="alert-bell-wrap">
      <button
        type="button"
        className={cn("alert-bell-btn", hasAlerts && "alert-bell-btn--active")}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Match alerts${hasAlerts ? ` (${unreadCount} new)` : ""}`}
        aria-expanded={open}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasAlerts && (
          <span className="alert-bell-badge" aria-hidden>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop — visible on mobile, covers content behind sheet */}
      {open && (
        <div
          className="alert-backdrop"
          onClick={close}
          aria-hidden
        />
      )}

      <AlertCenter open={open} onClose={close} />
    </div>
  )
}
