"use client"

import type { Match } from "@/types/match"
import type { MatchChange } from "@/types/alerts"
import { BUCKET_LABELS, type TimeBucket } from "@/lib/utils/time"
import { groupByLeague } from "@/lib/utils/league-groups"
import { LeagueSection } from "./LeagueSection"

interface MatchBucketListProps {
  bucket: TimeBucket
  items: Match[]
  latestChangeMap: Map<number, MatchChange>
}

export function MatchBucketList({ bucket, items, latestChangeMap }: MatchBucketListProps) {
  const leagueGroups = groupByLeague(items)
  return (
    <div className="cc-bucket">
      <div className="cc-bucket-head">
        <span>{BUCKET_LABELS[bucket]}</span>
        <span className="cc-bucket-line" />
        <span className="md-mono md-text-muted">{items.length}</span>
      </div>
      <div className="cc-league-groups">
        {leagueGroups.map((g) => (
          <LeagueSection
            key={g.league}
            league={g.league}
            matches={g.matches}
            compact
            latestChangeMap={latestChangeMap}
          />
        ))}
      </div>
    </div>
  )
}
