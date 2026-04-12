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
  { href: "/", label: "Home" },
  { href: "/live-matches", label: "Live" },
  { href: "/upcoming-matches", label: "Upcoming" },
  { href: "/predictions", label: "Predictions" },
  { href: "/odds-comparison", label: "Odds" },
  { href: "/insights", label: "Intelligence" },
  { href: "/trust", label: "Track Record" },
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
              {link.label}
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
