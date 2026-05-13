"use client"

import { MatchDirectoryPage } from "@/components/features/match/MatchDirectoryPage"

export default function UpcomingMatchesPage() {
  return <MatchDirectoryPage title="Upcoming Matches" filter={(m) => m.status === "UPCOMING"} compact />
}
