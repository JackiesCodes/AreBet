"use client"

import Link from "next/link"
import { useFavorites } from "@/hooks/useFavorites"
import { useMatchIntelligence } from "@/contexts/MatchIntelligenceContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/primitives/EmptyState"
import { Badge } from "@/components/primitives/Badge"
import { FavoritesSwitcher } from "@/components/features/FavoritesSwitcher"
import { CHANGE_ICONS, relativeTime } from "@/lib/utils/match-changes"
import { cn } from "@/lib/utils/cn"

export default function WatchlistPage() {
  const { favorites, loading } = useFavorites()
  const { changes, latestChangeMap, matches } = useMatchIntelligence()

  const watchedMatchIds = new Set(
    favorites.filter((f) => f.entity_type === "match").map((f) => f.entity_id),
  )

  // Find live match data for watched matches
  const watchedMatchData = matches.filter((m) => watchedMatchIds.has(String(m.id)))

  // Recent changes only for watched matches
  const watchedChanges = changes
    .filter((c) => watchedMatchIds.has(String(c.matchId)))
    .slice(0, 20)

  const matchFavs   = favorites.filter((f) => f.entity_type === "match")
  const teamFavs    = favorites.filter((f) => f.entity_type === "team")
  const leagueFavs  = favorites.filter((f) => f.entity_type === "league")

  return (
    <div className="md-page">
      <PageHeader
        title="Watchlist"
        subtitle="Followed matches, teams, and leagues — plus recent signals"
      />

      {loading ? (
        <div className="md-text-muted" style={{ padding: 24 }}>Loading…</div>
      ) : favorites.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          text="Follow a match, team, or league with the ♥ icon to track it here and get change alerts."
        />
      ) : (
        <div className="watchlist-layout">

          {/* ── Left: followed items ────────────────────────────────────── */}
          <div className="watchlist-main">

            {/* Watched matches with live context */}
            {matchFavs.length > 0 && (
              <section className="watchlist-section">
                <h2 className="watchlist-section-title">Followed Matches</h2>
                <div className="watchlist-match-list">
                  {matchFavs.map((fav) => {
                    const live = watchedMatchData.find((m) => String(m.id) === fav.entity_id)
                    const change = live ? latestChangeMap.get(live.id) : undefined
                    return (
                      <Link
                        key={fav.entity_id}
                        href={`/match/${fav.entity_id}`}
                        className={cn("watchlist-match-row", change && "watchlist-match-row--changed")}
                      >
                        <div className="watchlist-match-info">
                          <span className="watchlist-match-label">{fav.label}</span>
                          {typeof fav.meta?.league === "string" && (
                            <span className="watchlist-match-league">
                              {fav.meta.league}
                            </span>
                          )}
                          {live && (
                            <Badge tone={live.status === "LIVE" ? "live" : live.status === "FINISHED" ? "finished" : "upcoming"}>
                              {live.status === "LIVE"
                                ? `${live.minute ?? 0}' · ${live.score.home}–${live.score.away}`
                                : live.status === "FINISHED"
                                ? `FT ${live.score.home}–${live.score.away}`
                                : "Upcoming"}
                            </Badge>
                          )}
                        </div>
                        {change && (
                          <div className={cn("watchlist-change-pill", `watchlist-change-pill--${change.severity}`)}>
                            <span aria-hidden>{CHANGE_ICONS[change.type]}</span>
                            <span>{change.summary}</span>
                          </div>
                        )}
                        <FavoritesSwitcher
                          type="match"
                          id={fav.entity_id}
                          label={fav.label}
                          meta={fav.meta}
                        />
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Followed teams */}
            {teamFavs.length > 0 && (
              <section className="watchlist-section">
                <h2 className="watchlist-section-title">Followed Teams</h2>
                <div className="watchlist-entity-list">
                  {teamFavs.map((fav) => (
                    <div key={fav.entity_id} className="watchlist-entity-row">
                      <span className="watchlist-entity-label">{fav.label}</span>
                      <FavoritesSwitcher type="team" id={fav.entity_id} label={fav.label} meta={fav.meta} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Followed leagues */}
            {leagueFavs.length > 0 && (
              <section className="watchlist-section">
                <h2 className="watchlist-section-title">Followed Leagues</h2>
                <div className="watchlist-entity-list">
                  {leagueFavs.map((fav) => (
                    <div key={fav.entity_id} className="watchlist-entity-row">
                      <span className="watchlist-entity-label">{fav.label}</span>
                      <FavoritesSwitcher type="league" id={fav.entity_id} label={fav.label} meta={fav.meta} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Right: recent signals for watched matches ─────────────── */}
          <aside className="watchlist-signals">
            <h2 className="watchlist-section-title">Recent Signals</h2>
            {watchedChanges.length === 0 ? (
              <div className="watchlist-signals-empty">
                <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>🔔</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                  Signals for your watched matches will appear here during live play.
                </div>
              </div>
            ) : (
              <div className="watchlist-signals-list">
                {watchedChanges.map((c) => (
                  <Link
                    key={c.id}
                    href={`/match/${c.matchId}`}
                    className={cn("watchlist-signal-row", `watchlist-signal-row--${c.severity}`)}
                  >
                    <span className="watchlist-signal-icon" aria-hidden>{CHANGE_ICONS[c.type]}</span>
                    <div className="watchlist-signal-body">
                      <div className="watchlist-signal-summary">{c.summary}</div>
                      <div className="watchlist-signal-match">{c.matchLabel}</div>
                      {c.detail && <div className="watchlist-signal-detail">{c.detail}</div>}
                    </div>
                    <span className="watchlist-signal-time">{relativeTime(c.ts)}</span>
                  </Link>
                ))}
              </div>
            )}
          </aside>

        </div>
      )}
    </div>
  )
}
