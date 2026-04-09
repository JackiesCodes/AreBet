"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { createClient } from "@/lib/supabase/client"
import {
  type LocalFavorite,
  STORAGE_KEYS,
  loadLocalFavorites,
  saveLocalFavorites,
} from "@/lib/storage/stickiness"
import type { FavoriteEntityType } from "@/types/user"

interface FavoritesState {
  favorites: LocalFavorite[]
  loading: boolean
  isFavorite: (type: FavoriteEntityType, id: string) => boolean
  toggleFavorite: (fav: Omit<LocalFavorite, "created_at">) => void
}

/**
 * useFavorites — optimistic toggling, last-intent-wins, cross-tab sync.
 */
export function useFavorites(): FavoritesState {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<LocalFavorite[]>([])
  const [loading, setLoading] = useState(true)
  const intentRef = useRef<Map<string, number>>(new Map())
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  if (!supabaseRef.current && typeof window !== "undefined") {
    try {
      supabaseRef.current = createClient()
    } catch {
      supabaseRef.current = null
    }
  }

  // Initial load
  useEffect(() => {
    let mounted = true
    setFavorites(loadLocalFavorites())

    async function fetchRemote() {
      if (!user || !supabaseRef.current) {
        if (mounted) setLoading(false)
        return
      }
      try {
        const { data } = await supabaseRef.current
          .from("favorites")
          .select("*")
          .eq("user_id", user.id)
        if (data && mounted) {
          const remote: LocalFavorite[] = data.map((row) => ({
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            label: row.label,
            meta: row.meta,
            created_at: row.created_at,
          }))
          setFavorites(remote)
          saveLocalFavorites(remote)
        }
      } catch {
        /* swallow */
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchRemote()
    return () => {
      mounted = false
    }
  }, [user])

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.favorites) {
        setFavorites(loadLocalFavorites())
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const isFavorite = useCallback(
    (type: FavoriteEntityType, id: string) => {
      return favorites.some((f) => f.entity_type === type && f.entity_id === id)
    },
    [favorites],
  )

  const toggleFavorite = useCallback(
    (fav: Omit<LocalFavorite, "created_at">) => {
      const key = `${fav.entity_type}:${fav.entity_id}`
      const intent = (intentRef.current.get(key) ?? 0) + 1
      intentRef.current.set(key, intent)

      setFavorites((current) => {
        const exists = current.some(
          (f) => f.entity_type === fav.entity_type && f.entity_id === fav.entity_id,
        )
        const next = exists
          ? current.filter((f) => !(f.entity_type === fav.entity_type && f.entity_id === fav.entity_id))
          : [...current, { ...fav, created_at: new Date().toISOString() }]
        saveLocalFavorites(next)

        // Cross-tab broadcast hint
        try {
          window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEYS.favorites }))
        } catch {
          /* ignore */
        }

        // Remote write — last intent wins
        if (user && supabaseRef.current) {
          const supabase = supabaseRef.current
          ;(async () => {
            try {
              if (exists) {
                await supabase
                  .from("favorites")
                  .delete()
                  .eq("user_id", user.id)
                  .eq("entity_type", fav.entity_type)
                  .eq("entity_id", fav.entity_id)
              } else {
                await supabase.from("favorites").insert({
                  user_id: user.id,
                  entity_type: fav.entity_type,
                  entity_id: fav.entity_id,
                  label: fav.label,
                  meta: fav.meta,
                })
              }
            } catch {
              // rollback if intent has not been superseded
              if (intentRef.current.get(key) === intent) {
                setFavorites(loadLocalFavorites())
              }
            }
          })()
        }
        return next
      })
    },
    [user],
  )

  return { favorites, loading, isFavorite, toggleFavorite }
}
