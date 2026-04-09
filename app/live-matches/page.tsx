"use client"

import { MatchDirectoryPage } from "@/components/features/MatchDirectoryPage"

export default function LiveMatchesPage() {
  return <MatchDirectoryPage title="Live Matches" filter={(m) => m.status === "LIVE"} />
}
