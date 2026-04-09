"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { createClient } from "@/lib/supabase/client"
import {
  DEFAULT_PREFERENCES,
  type LocalPreferences,
  loadLocalPreferences,
  saveLocalPreferences,
} from "@/lib/storage/stickiness"
import { debounce } from "@/lib/utils/debounce"

interface PreferencesState {
  prefs: LocalPreferences
  loading: boolean
  setPrefs: (patch: Partial<LocalPreferences>) => void
}

/**
 * usePreferences — dual storage:
 *  - signed-in user → Supabase (with localStorage as cache)
 *  - guest → localStorage only
 *
 * Writes are debounced (500ms). Sync happens on visibility change.
 */
export function usePreferences(): PreferencesState {
  const { user } = useAuth()
  const [prefs, setPrefsState] = useState<LocalPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  if (!supabaseRef.current && typeof window !== "undefined") {
    try {
      supabaseRef.current = createClient()
    } catch {
      supabaseRef.current = null
    }
  }

  // Initial load — local first, then merge remote if signed in
  useEffect(() => {
    let mounted = true
    setPrefsState(loadLocalPreferences())

    async function fetchRemote() {
      if (!user || !supabaseRef.current) {
        if (mounted) setLoading(false)
        return
      }
      try {
        const { data } = await supabaseRef.current
          .from("preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
        if (data && mounted) {
          const merged = { ...DEFAULT_PREFERENCES, ...data } as LocalPreferences
          setPrefsState(merged)
          saveLocalPreferences(merged)
        }
      } catch {
        /* graceful */
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchRemote()
    return () => {
      mounted = false
    }
  }, [user])

  const debouncedRemoteWrite = useRef(
    debounce(async (next: LocalPreferences, userId: string | null) => {
      if (!userId || !supabaseRef.current) return
      try {
        await supabaseRef.current.from("preferences").upsert({ user_id: userId, ...next })
      } catch {
        /* graceful */
      }
    }, 500),
  ).current

  const setPrefs = useCallback(
    (patch: Partial<LocalPreferences>) => {
      setPrefsState((current) => {
        const next = { ...current, ...patch }
        saveLocalPreferences(next)
        debouncedRemoteWrite(next, user?.id ?? null)
        return next
      })
    },
    [user, debouncedRemoteWrite],
  )

  // Sync on tab visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) return
      setPrefsState(loadLocalPreferences())
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  return { prefs, loading, setPrefs }
}
