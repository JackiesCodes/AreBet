"use client"

import Link from "next/link"
import { useFavorites } from "@/hooks/useFavorites"
import { useMatchFeedCtx } from "@/contexts/MatchFeedContext"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/primitives/EmptyState"
import { Badge } from "@/components/primitives/Badge"
import { FavoritesSwitcher } from "@/components/features/nav/FavoritesSwitcher"
import type { Match } from "@/types/match"

// ── Live Now strip ─────────────────────────────────────────────────────────────

function LiveNowStrip({ liveMatches }: { liveMatches: Match[] }) {
  if (liveMatches.length === 0) return null
  return (
    <div className="wl-live-strip">
      <span className="wl-live-strip-label">
        <span className="wl-live-pulse" aria-hidden /> Live Now
      </span>
      <div className="wl-live-scroll">
        {liveMatches.map((m) => (
          <Link key={m.id} href={`/match/${m.id}`} className="wl-live-card">
            <span className="wl-live-card-teams">
              {m.home.short} <span className="wl-live-score">{m.score.home}–{m.score.away}</span> {m.away.short}
            </span>
            <span className="wl-live-min">{m.minute ?? 0}&prime;</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const { favorites, loading } = useFavorites()
  const { matches } = useMatchFeedCtx()

  const watchedMatchIds = new Set(
    favorites.filter((f) => f.entity_type === "match").map((f) => f.entity_id),
  )

  const watchedMatchData = matches.filter((m) => watchedMatchIds.has(String(m.id)))
  const liveWatchedMatches = watchedMatchData.filter((m) => m.status === "LIVE")

  const matchFavs  = favorites.filter((f) => f.entity_type === "match")
  const teamFavs   = favorites.filter((f) => f.entity_type === "team")
  const leagueFavs = favorites.filter((f) => f.entity_type === "league")

  return (
    <div className="md-page">
      <PageHeader
        title="Watchlist"
        subtitle="Followed matches, teams, and leagues"
      />

      {/* Live now strip — only when watched matches are live */}
      {!loading && liveWatchedMatches.length > 0 && (
        <LiveNowStrip liveMatches={liveWatchedMatches} />
      )}

      {loading ? (
        <div className="md-text-muted" style={{ padding: 24 }}>Loading…</div>
      ) : favorites.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          text="Follow a match, team, or league with the ♥ icon to track it here."
        />
      ) : (
        <div className="watchlist-layout">

          {/* ── Left: followed items ─────────────────────── */}
          <div className="watchlist-main">

            {matchFavs.length > 0 && (
              <section className="watchlist-section">
                <h2 className="watchlist-section-title">Followed Matches</h2>
                <div className="watchlist-match-list">
                  {matchFavs.map((fav) => {
                    const live = watchedMatchData.find((m) => String(m.id) === fav.entity_id)
                    return (
                      <Link
                        key={fav.entity_id}
                        href={`/match/${fav.entity_id}`}
                        className="watchlist-match-row"
                      >
                        <div className="watchlist-match-info">
                          <span className="watchlist-match-label">{fav.label}</span>
                          {typeof fav.meta?.league === "string" && (
                            <span className="watchlist-match-league">{fav.meta.league}</span>
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

        </div>
      )}
    </div>
  )
}
