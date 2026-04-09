"use client"

import type { Match } from "@/types/match"
import { formatTime } from "@/lib/utils/time"
import { ConfidenceHeat } from "@/components/primitives/ConfidenceHeat"
import { Badge } from "@/components/primitives/Badge"
import { useFormatOdds } from "@/hooks/useFormatOdds"

interface MatchTableRowProps {
  match: Match
  onSelect?: (m: Match) => void
}

export function MatchTableRow({ match, onSelect }: MatchTableRowProps) {
  const fmt = useFormatOdds()
  return (
    <tr onClick={() => onSelect?.(match)} style={{ cursor: "pointer" }}>
      <td>
        <Badge tone={match.status === "LIVE" ? "live" : match.status === "FINISHED" ? "finished" : "upcoming"}>
          {match.status === "LIVE" ? `${match.minute ?? 0}'` : match.status === "FINISHED" ? "FT" : formatTime(match.kickoffISO)}
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
