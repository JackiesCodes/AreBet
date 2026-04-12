"use client"

import type { ReactNode } from "react"
import { LeftSidebar } from "./LeftSidebar"
import { RightPanel } from "./RightPanel"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <LeftSidebar />
      <main className="app-main">
        {children}
      </main>
      <RightPanel />
    </div>
  )
}
