"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { signOutAction } from "@/lib/auth/actions"
import { Avatar } from "@/components/primitives/Avatar"
import { TierBadge } from "@/components/primitives/TierBadge"
import { cn } from "@/lib/utils/cn"

const MENU_LINKS = [
  { href: "/user/profile",    label: "Profile",      icon: "◉" },
  { href: "/user/dashboard",  label: "Dashboard",    icon: "📊" },
  { href: "/favorites",       label: "Watchlist",    icon: "♥" },
  { href: "/subscription",    label: "Subscription", icon: "⚡" },
  { href: "/settings",        label: "Settings",     icon: "⚙" },
]

export function ProfilePanel() {
  const { user, tier } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  if (!user) return null

  const displayName = user.email?.split("@")[0] ?? "User"

  return (
    <div ref={ref} className="profile-panel-root">
      <button
        type="button"
        className="profile-panel-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar label={user.email ?? "U"} />
      </button>

      {open && (
        <div className="profile-panel-menu" role="menu">
          {/* User identity */}
          <div className="profile-panel-identity">
            <Avatar label={user.email ?? "U"} size="lg" />
            <div className="profile-panel-identity-text">
              <div className="profile-panel-name">{displayName}</div>
              <div className="profile-panel-email">{user.email}</div>
              <div style={{ marginTop: 6 }}>
                <TierBadge tier={tier ?? "free"} />
              </div>
            </div>
          </div>

          <div className="profile-panel-divider" />

          {/* Nav links */}
          <div className="profile-panel-links">
            {MENU_LINKS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="profile-panel-link"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <span className="profile-panel-link-icon" aria-hidden>{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          <div className="profile-panel-divider" />

          {/* Sign out */}
          <form action={signOutAction} className="profile-panel-signout">
            <button type="submit" className="profile-panel-signout-btn" role="menuitem">
              <span aria-hidden>↩</span>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
