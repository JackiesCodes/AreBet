"use client"

import { useTheme } from "@/hooks/useTheme"

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      className="md-btn md-btn--ghost md-btn--sm"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title="Toggle theme"
    >
      {theme === "dark" ? "☾" : "☀"}
    </button>
  )
}
