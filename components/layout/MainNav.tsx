"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils/cn"
import { useAuth } from "@/lib/auth/context"
import { ThemeToggle } from "@/components/features/ThemeToggle"
import { ProfilePanel } from "@/components/features/ProfilePanel"
import { GlobalSearch } from "@/components/features/GlobalSearch"
import { AlertBell } from "@/components/features/AlertBell"

const NAV_LINKS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/live-matches",
    label: "Live",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/upcoming-matches",
    label: "Upcoming",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/predictions",
    label: "Predictions",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/odds-comparison",
    label: "Odds",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "Intelligence",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    href: "/trust",
    label: "Track Record",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
]

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="nav-root">
      <div className="nav-inner">
        <button className="nav-hamburger" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className="nav-brand">
          <span className="nav-brand-mark">A</span>
          <span>AreBet</span>
        </Link>

        <nav className="nav-links">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "nav-link",
                (pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href))) &&
                  "nav-link--active",
              )}
            >
              <span className="nav-link-icon" aria-hidden>{link.icon}</span>
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <button
            className="nav-search"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              readOnly
              placeholder="Search teams, leagues, players…"
              style={{ marginLeft: 8 }}
              tabIndex={-1}
            />
          </button>
          <AlertBell />
          <ThemeToggle />
          {user ? (
            <ProfilePanel />
          ) : (
            <Link href="/auth/login" className="md-btn md-btn--primary md-btn--sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  )
}
