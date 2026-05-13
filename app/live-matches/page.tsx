"use client"

import { MatchDirectoryPage } from "@/components/features/match/MatchDirectoryPage"

export default function LiveMatchesPage() {
  return <MatchDirectoryPage title="Live Matches" filter={(m) => m.status === "LIVE"} compact />
}
