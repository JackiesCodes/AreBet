import { notFound } from "next/navigation"
import { fetchMatchById } from "@/lib/services/matches"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/primitives/Badge"
import { FormGuide } from "@/components/primitives/FormGuide"
import { MatchDetailTabs } from "@/components/features/MatchDetailTabs"
import { MatchIntelligenceSummary } from "@/components/features/MatchIntelligenceSummary"
import { formatTime } from "@/lib/utils/time"

interface PageProps {
  params: Promise<{ matchId: string }>
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { matchId } = await params
  const id = Number.parseInt(matchId, 10)
  if (Number.isNaN(id)) notFound()
  const match = await fetchMatchById(id)
  if (!match) notFound()

  const isLive = match.status === "LIVE"
  const isFinished = match.status === "FINISHED"

  return (
    <div className="md-page">
      <PageHeader
        title={`${match.home.name} vs ${match.away.name}`}
        subtitle={match.league}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: match.league, href: "/" },
          { label: `${match.home.short} vs ${match.away.short}` },
        ]}
      />

      {/* Match Hero */}
      <div className="match-hero">
        <div className="match-hero-meta">
          <Badge tone={isLive ? "live" : isFinished ? "finished" : "upcoming"}>
            {isLive ? `LIVE · ${match.minute}'` : isFinished ? "Full Time" : formatTime(match.kickoffISO)}
          </Badge>
          <span className="match-hero-league">{match.league}</span>
          {match.venue && <span className="match-hero-venue">{match.venue}</span>}
        </div>

        <div className="match-hero-scoreboard">
          {/* Home team */}
          <div className="match-hero-team match-hero-team--home">
            <div className="match-hero-team-crest" aria-hidden>
              {match.home.short.slice(0, 2).toUpperCase()}
            </div>
            <div className="match-hero-team-name">{match.home.name}</div>
            <FormGuide form={match.home.form} />
          </div>

          {/* Score */}
          <div className="match-hero-score">
            {isLive || isFinished ? (
              <>
                <span className={`match-hero-score-num ${isLive ? "match-hero-score-num--live" : ""}`}>
                  {match.score.home}
                </span>
                <span className="match-hero-score-sep">–</span>
                <span className={`match-hero-score-num ${isLive ? "match-hero-score-num--live" : ""}`}>
                  {match.score.away}
                </span>
              </>
            ) : (
              <>
                <span className="match-hero-xg">{match.prediction.expectedGoals.home}</span>
                <span className="match-hero-score-sep match-hero-score-sep--xs">xG</span>
                <span className="match-hero-xg">{match.prediction.expectedGoals.away}</span>
              </>
            )}
          </div>

          {/* Away team */}
          <div className="match-hero-team match-hero-team--away">
            <div className="match-hero-team-crest" aria-hidden>
              {match.away.short.slice(0, 2).toUpperCase()}
            </div>
            <div className="match-hero-team-name">{match.away.name}</div>
            <FormGuide form={match.away.form} />
          </div>
        </div>
      </div>

      {/* Intelligence Summary (signals before tabs) */}
      <MatchIntelligenceSummary match={match} />

      {/* Detail tabs */}
      <MatchDetailTabs match={match} />
    </div>
  )
}
