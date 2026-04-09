import { notFound } from "next/navigation"
import { fetchMatchById } from "@/lib/services/matches"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/primitives/Badge"
import { ConfidenceHeat } from "@/components/primitives/ConfidenceHeat"
import { MatchDetailTabs } from "@/components/features/MatchDetailTabs"
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

  return (
    <div className="md-page">
      <PageHeader
        title={`${match.home.name} vs ${match.away.name}`}
        subtitle={`${match.league} · ${match.venue}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: match.league, href: "/" },
          { label: `${match.home.short} vs ${match.away.short}` },
        ]}
      />
      <div className="md-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Badge tone={match.status === "LIVE" ? "live" : match.status === "FINISHED" ? "finished" : "upcoming"}>
            {match.status === "LIVE" ? `LIVE · ${match.minute}'` : match.status === "FINISHED" ? "FT" : formatTime(match.kickoffISO)}
          </Badge>
          <div className="md-mono" style={{ fontSize: 24, fontWeight: 700 }}>
            {match.score.home} – {match.score.away}
          </div>
          <ConfidenceHeat value={match.prediction.confidence} />
        </div>
      </div>
      <MatchDetailTabs match={match} />
    </div>
  )
}
