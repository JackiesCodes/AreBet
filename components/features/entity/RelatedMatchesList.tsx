import Link from "next/link"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import type { Match } from "@/types/match"

interface RelatedMatchesListProps {
  matches: Match[]
  title?: string
  teamId?: number
}

/**
 * Compact match list for entity pages (team/player).
 * Each row links to the match detail page.
 */
export function RelatedMatchesList({ matches, title = "Related Matches", teamId }: RelatedMatchesListProps) {
  if (matches.length === 0) return null

  return (
    <section className="related-matches">
      <h2 className="related-matches-title">{title}</h2>
      <div className="related-matches-list">
        {matches.map((m) => {
          const isHome = teamId != null ? m.home.id === teamId : true
          const isLive = m.status === "LIVE"
          const isFinished = m.status === "FINISHED"
          const showScore = isLive || isFinished
          const today = new Date()
          const kickoff = new Date(m.kickoffISO)
          const isToday = kickoff.toDateString() === today.toDateString()
          const timeLabel = isLive
            ? `${m.minute ?? 0}′`
            : isFinished
              ? "FT"
              : isToday
                ? formatTime(m.kickoffISO)
                : `${formatShortDate(m.kickoffISO)} · ${formatTime(m.kickoffISO)}`

          return (
            <Link key={m.id} href={`/match/${m.id}`} className="related-matches-row">
              <span className={`related-matches-status related-matches-status--${m.status.toLowerCase()}`}>
                {isLive ? <span className="rp-live-pip" aria-hidden /> : null}
                {timeLabel}
              </span>
              <span className="related-matches-home">{m.home.name}</span>
              {showScore ? (
                <span className="related-matches-score">{m.score.home} – {m.score.away}</span>
              ) : (
                <span className="related-matches-vs">vs</span>
              )}
              <span className="related-matches-away">{m.away.name}</span>
              <span className="related-matches-league">{m.league}</span>
              {m.prediction.confidence > 0 && (
                <span className="related-matches-conf">{Math.round(m.prediction.confidence)}%</span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
