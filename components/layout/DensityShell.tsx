"use client"

import { useEffect, type ReactNode } from "react"
import { usePreferences } from "@/hooks/usePreferences"

/**
 * Applies [data-density] to the root element so density tokens take effect.
 */
export function DensityShell({ children }: { children: ReactNode }) {
  const { prefs, loading } = usePreferences()

  useEffect(() => {
    if (loading) return
    document.documentElement.dataset.density = prefs.density
  }, [prefs.density, loading])

  return <>{children}</>
}
