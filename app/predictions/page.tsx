"use client"

import { MatchDirectoryPage } from "@/components/features/MatchDirectoryPage"

export default function PredictionsPage() {
  return (
    <MatchDirectoryPage
      title="Predictions"
      filter={(m) => (m.prediction?.confidence ?? 0) >= 60 && m.status !== "FINISHED"}
    />
  )
}
