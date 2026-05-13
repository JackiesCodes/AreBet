"use client"

import { useRouter } from "next/navigation"
import type { Match } from "@/types/match"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import { ConfidenceHeat } from "@/components/primitives/ConfidenceHeat"
import { Badge } from "@/components/primitives/Badge"
import { useFormatOdds } from "@/hooks/useFormatOdds"

interface MatchTableRowProps {
  match: Match
}

export function MatchTableRow({ match }: MatchTableRowProps) {
  const fmt = useFormatOdds()
  const router = useRouter()
  return (
    <tr onClick={() => router.push(`/match/${match.id}`)} style={{ cursor: "pointer" }}>
      <td>
        <Badge tone={match.status === "LIVE" ? "live" : match.status === "FINISHED" ? "finished" : "upcoming"}>
          {match.status === "LIVE" ? `${match.minute ?? 0}'` : match.status === "FINISHED" ? "FT" : `${formatShortDate(match.kickoffISO)} · ${formatTime(match.kickoffISO)}`}
        </Badge>
      </td>
      <td>{match.league}</td>
      <td>
        {match.home.name} vs {match.away.name}
      </td>
      <td>
        {match.status !== "UPCOMING" && (
          <span className="md-mono">
            {match.score.home}–{match.score.away}
          </span>
        )}
      </td>
      <td><ConfidenceHeat value={match.prediction.confidence} /></td>
      <td className="md-mono">{fmt(match.odds.home)}</td>
      <td className="md-mono">{fmt(match.odds.draw)}</td>
      <td className="md-mono">{fmt(match.odds.away)}</td>
    </tr>
  )
}
