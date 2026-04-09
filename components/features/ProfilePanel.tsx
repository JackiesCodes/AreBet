"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { signOutAction } from "@/lib/auth/actions"
import { Avatar } from "@/components/primitives/Avatar"
import { TierBadge } from "@/components/primitives/TierBadge"

export function ProfilePanel() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (ref.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  if (!user) return null

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile menu"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <Avatar label={user.email ?? "U"} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: 44,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-3)",
            minWidth: 220,
            zIndex: 200,
            padding: 8,
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Signed in as</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user.email}</div>
            <div style={{ marginTop: 6 }}>
              <TierBadge tier="free" />
            </div>
          </div>
          <Link href="/user/dashboard" className="nav-link" style={{ display: "block" }}>Dashboard</Link>
          <Link href="/settings" className="nav-link" style={{ display: "block" }}>Settings</Link>
          <Link href="/subscription" className="nav-link" style={{ display: "block" }}>Subscription</Link>
          <Link href="/favorites" className="nav-link" style={{ display: "block" }}>Favorites</Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="md-btn md-btn--ghost md-btn--sm md-btn--block"
              style={{ marginTop: 4, justifyContent: "flex-start" }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
