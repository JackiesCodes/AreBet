"use client"

import { useCallback, useEffect, useState } from "react"
import { STORAGE_KEYS } from "@/lib/storage/stickiness"

export type Theme = "dark" | "light"

const THEME_KEY = STORAGE_KEYS.theme

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "dark"
      setThemeState(saved === "light" ? "light" : "dark")
    } catch {
      /* ignore */
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
      document.documentElement.dataset.theme = next
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
