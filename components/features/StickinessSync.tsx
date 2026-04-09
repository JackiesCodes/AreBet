"use client"

import { useEffect } from "react"
import { STORAGE_KEYS } from "@/lib/storage/stickiness"

/**
 * Listens to Storage events to keep tabs in sync. The actual stores
 * (favorites, ui-state) re-read on key changes via their own hooks.
 */
export function StickinessSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      const watched = Object.values(STORAGE_KEYS) as string[]
      if (!watched.includes(e.key)) return
      // Trigger a custom event so hooks can react.
      window.dispatchEvent(new CustomEvent("arebet:storage", { detail: { key: e.key } }))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  return null
}
