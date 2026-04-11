"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils/cn"

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/live-matches", label: "Live", icon: "●" },
  { href: "/predictions", label: "Picks", icon: "✦" },
  { href: "/favorites", label: "Watch", icon: "♥" },
  { href: "/user/dashboard", label: "Me", icon: "◉" },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom navigation">
      <div className="mobile-bottom-nav-inner">
        {ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-bottom-nav-item", active && "mobile-bottom-nav-item--active")}
            >
              <span aria-hidden style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
