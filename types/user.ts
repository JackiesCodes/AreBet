export type Tier = "free" | "pro" | "elite"

export type Density = "compact" | "comfortable"

export type OddsFormat = "decimal" | "fractional" | "american"

export type FavoriteEntityType = "match" | "team" | "league"

export interface Profile {
  id: string
  email: string
  tier: Tier
  created_at: string
}

export interface UserPreferences {
  density: Density
  default_sort: "confidence" | "kickoff" | "odds" | "league"
  default_filter_status: "all" | "live" | "soon" | "favorites" | "high"
  show_favorites_first: boolean
  hide_finished: boolean
  odds_format: OddsFormat
}

export interface FavoriteRecord {
  id?: string
  user_id?: string
  entity_type: FavoriteEntityType
  entity_id: string
  label: string
  meta?: Record<string, unknown>
  created_at?: string
}
