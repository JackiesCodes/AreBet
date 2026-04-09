"use client"

import { useFavorites } from "@/hooks/useFavorites"
import type { FavoriteEntityType } from "@/types/user"

interface FavoritesSwitcherProps {
  type: FavoriteEntityType
  id: string
  label: string
  meta?: Record<string, unknown>
}

export function FavoritesSwitcher({ type, id, label, meta }: FavoritesSwitcherProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(type, id)

  return (
    <button
      type="button"
      aria-label={active ? "Remove favorite" : "Add favorite"}
      title={active ? "Remove favorite" : "Add favorite"}
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite({ entity_type: type, entity_id: id, label, meta })
      }}
      style={{
        padding: 4,
        color: active ? "var(--negative)" : "var(--text-muted)",
        fontSize: 14,
        lineHeight: 1,
      }}
    >
      {active ? "♥" : "♡"}
    </button>
  )
}
