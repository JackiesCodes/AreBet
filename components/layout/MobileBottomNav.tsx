"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils/cn"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/live-matches", label: "Live", icon: "●" },
  { href: "/predictions", label: "Picks", icon: "✦" },
  { href: "/favorites", label: "Watch", icon: "♥" },
  { href: "/user/profile", label: "Me", icon: "◉", alertBadge: true },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useMatchIntelligence()

  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
      <div className="mobile-bottom-nav-inner">
        {ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          const showBadge = item.alertBadge && unreadCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-bottom-nav-item", active && "mobile-bottom-nav-item--active")}
            >
              <span className="mobile-bottom-nav-icon-wrap" aria-hidden>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {showBadge && (
                  <span className="mobile-bottom-nav-badge" aria-label={`${unreadCount} unread alerts`} />
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
