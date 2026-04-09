"use client"

import { useCallback } from "react"
import { formatOdds } from "@/lib/utils/format-odds"
import { usePreferences } from "./usePreferences"

export function useFormatOdds(): (decimal: number) => string {
  const { prefs } = usePreferences()
  return useCallback(
    (decimal: number) => formatOdds(decimal, prefs.odds_format),
    [prefs.odds_format],
  )
}
