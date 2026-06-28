"use client"

import type { ReactNode } from "react"
import { LeftSidebar } from "./LeftSidebar"
import { BetSlip } from "@/components/features/betslip/BetSlip"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <LeftSidebar />
      <div className="app-main">
        {children}
      </div>

      {/* Bet Slip — fixed positioned overlay */}
      <BetSlip />
    </div>
  )
}
