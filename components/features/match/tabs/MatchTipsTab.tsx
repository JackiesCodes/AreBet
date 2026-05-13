"use client"

import type { Match } from "@/types/match"
import { MatchTips } from "@/components/features/match/MatchTips"

export function MatchTipsTab({ match }: { match: Match }) {
  return <MatchTips match={match} />
}
