"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils/cn"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { useBetSlip } from "@/contexts/BetSlipContext"

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/live-matches", label: "Live", icon: "●" },
  { href: "/my-bets", label: "Bets", icon: "✦", betBadge: true },
  { href: "/favorites", label: "Watch", icon: "♥" },
  { href: "/user/profile", label: "Me", icon: "◉", alertBadge: true },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useMatchIntelligence()
  const { betCount, setIsOpen } = useBetSlip()

  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
      <div className="mobile-bottom-nav-inner">
        {ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          const showAlertBadge = item.alertBadge && unreadCount > 0
          const showBetBadge = item.betBadge && betCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-bottom-nav-item", active && "mobile-bottom-nav-item--active")}
            >
              <span className="mobile-bottom-nav-icon-wrap" aria-hidden>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {showAlertBadge && (
                  <span className="mobile-bottom-nav-badge" aria-label={`${unreadCount} unread alerts`} />
                )}
                {showBetBadge && (
                  <span className="mobile-bottom-nav-badge mobile-bottom-nav-badge--bet" aria-label={`${betCount} bets`}>
                    {betCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
        {/* Bet Slip FAB for mobile */}
        <button
          type="button"
          className="mobile-bottom-nav-item mobile-bottom-nav-betslip"
          onClick={() => setIsOpen(true)}
          aria-label={`Open bet slip${betCount > 0 ? `, ${betCount} selections` : ""}`}
        >
          <span className="mobile-bottom-nav-icon-wrap" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            {betCount > 0 && (
              <span className="mobile-bottom-nav-badge mobile-bottom-nav-badge--bet">{betCount}</span>
            )}
          </span>
          <span>Slip</span>
        </button>
      </div>
    </nav>
  )
}
