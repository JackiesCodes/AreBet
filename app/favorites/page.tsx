"use client"

import { useFavorites } from "@/hooks/useFavorites"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/primitives/EmptyState"
import { Badge } from "@/components/primitives/Badge"
import { FavoritesSwitcher } from "@/components/features/FavoritesSwitcher"

export default function FavoritesPage() {
  const { favorites, loading } = useFavorites()

  return (
    <div className="md-page">
      <PageHeader title="Favorites" subtitle="Your starred matches, teams and leagues" />
      {loading ? (
        <div className="md-text-muted">Loading…</div>
      ) : favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          text="Tap the heart icon on a match, team or league to add it here."
        />
      ) : (
        <div className="md-stack" style={{ gap: 8 }}>
          {favorites.map((f) => (
            <div
              key={`${f.entity_type}-${f.entity_id}`}
              className="md-card"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge tone="neutral">{f.entity_type}</Badge>
                <strong>{f.label}</strong>
              </div>
              <FavoritesSwitcher type={f.entity_type} id={f.entity_id} label={f.label} meta={f.meta} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
