"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils/cn"
import { useAuth } from "@/lib/auth/context"
import { ProfilePanel } from "@/components/features/nav/ProfilePanel"
import { GlobalSearch } from "@/components/features/search/GlobalSearch"
import { useBetSlip } from "@/contexts/BetSlipContext"
import { createClient } from "@/lib/supabase/client"

const NAV_LINKS = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/live-matches",
    label: "In-Play",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/my-bets",
    label: "My Bets",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    href: "/promotions",
    label: "Promotions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
]

export function MainNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { betCount, setIsOpen: setBetSlipOpen } = useBetSlip()
  const [searchOpen, setSearchOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const lastSearchQueryRef = useRef("")

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [drawerOpen])

  // Load user balance
  useEffect(() => {
    if (!user) { setBalance(null); return }
    const supabase = createClient()
    supabase
      .from("profiles")
      .select("bankroll")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setBalance(data.bankroll ?? 0)
      })
  }, [user])

  return (
    <>
      <div className="sport-switcher" role="tablist" aria-label="Sport selection">
        <button type="button" role="tab" aria-selected className="sport-tab sport-tab--active">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M5 12s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4z" />
          </svg>
          Football
        </button>
        <button type="button" role="tab" aria-selected={false} className="sport-tab sport-tab--disabled" title="Coming Soon" aria-disabled="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </svg>
          Basketball
        </button>
        <button type="button" role="tab" aria-selected={false} className="sport-tab sport-tab--disabled" title="Coming Soon" aria-disabled="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <ellipse cx="12" cy="12" rx="4" ry="10" />
            <path d="M2 12h20" />
          </svg>
          Tennis
        </button>
      </div>

      <header className="nav-root">
        <div className="nav-inner">
          {/* Hamburger — mobile only */}
          <button
            className="nav-hamburger"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {drawerOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <Link href="/" className="nav-brand" aria-label="AreBet — Home">
            <svg viewBox="0 0 120 30" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <text x="0" y="24"
                fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                fontWeight="800"
                fontSize="28"
                letterSpacing="-0.8">
                <tspan fill="currentColor">Are</tspan>
                <tspan fill="#22c55e">Bet</tspan>
              </text>
            </svg>
          </Link>

          {/* Desktop nav links */}
          <nav className="nav-links" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("nav-link", isActive && "nav-link--active")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="nav-link-icon" aria-hidden>{link.icon}</span>
                  <span className="nav-link-label">{link.label}</span>
                </Link>
              )
            })}
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
              <span style={{ marginLeft: 8 }} aria-hidden="true">Search teams, leagues, players…</span>
            </button>
            {/* Search icon for mobile (always visible) */}
            <button
              className="nav-search-icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            {user && balance !== null && (
              <Link href="/deposit" className="balance-chip" aria-label={`Account balance: $${balance.toFixed(2)}, click to deposit`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                ${balance.toFixed(2)}
              </Link>
            )}
            <button
              type="button"
              className={cn("nav-bet-slip-btn", betCount > 0 && "nav-bet-slip-btn--has-bets")}
              onClick={() => setBetSlipOpen(true)}
              aria-label={`Open bet slip${betCount > 0 ? `, ${betCount} selection${betCount !== 1 ? "s" : ""}` : ""}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
              <span className="nav-bet-slip-label">Slip</span>
              {betCount > 0 && (
                <span className="nav-bet-slip-badge" aria-hidden>{betCount}</span>
              )}
            </button>
            {user ? (
              <ProfilePanel />
            ) : (
              <Link href="/auth/login" className="md-btn md-btn--primary md-btn--sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div className="nav-drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden />
      )}

      {/* Mobile drawer */}
      <nav
        id="mobile-nav-drawer"
        className={cn("nav-drawer", drawerOpen && "nav-drawer--open")}
        aria-label="Mobile navigation"
        aria-hidden={!drawerOpen}
      >
        <div className="nav-drawer-header">
          <Link href="/" className="nav-brand" aria-label="AreBet — Home" onClick={() => setDrawerOpen(false)}>
            <svg viewBox="0 0 120 30" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <text x="0" y="24"
                fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                fontWeight="800"
                fontSize="28"
                letterSpacing="-0.8">
                <tspan fill="currentColor">Are</tspan>
                <tspan fill="#22c55e">Bet</tspan>
              </text>
            </svg>
          </Link>
          <button
            className="nav-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="nav-drawer-links">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn("nav-drawer-link", active && "nav-drawer-link--active")}
                aria-current={active ? "page" : undefined}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="nav-drawer-link-icon" aria-hidden>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="nav-drawer-footer">
          {user ? (
            <ProfilePanel />
          ) : (
            <Link href="/auth/login" className="md-btn md-btn--primary" onClick={() => setDrawerOpen(false)}>
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {searchOpen && (
        <GlobalSearch
          defaultQuery={lastSearchQueryRef.current}
          onClose={(lastQuery) => {
            lastSearchQueryRef.current = lastQuery
            setSearchOpen(false)
          }}
        />
      )}
    </>
  )
}
