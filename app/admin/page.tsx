"use client"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardSubtitle, CardTitle } from "@/components/primitives/Card"
import { useMatchFeed } from "@/hooks/useMatchFeed"
import { Skeleton } from "@/components/primitives/Skeleton"
import { Badge } from "@/components/primitives/Badge"

export default function AdminPage() {
  const { matches, loading, error, fetchedAt } = useMatchFeed({ pollIntervalMs: 30_000 })

  const counts = {
    live: matches.filter((m) => m.status === "LIVE").length,
    upcoming: matches.filter((m) => m.status === "UPCOMING").length,
    finished: matches.filter((m) => m.status === "FINISHED").length,
  }

  return (
    <div className="md-page">
      <PageHeader title="Admin" subtitle="System status and feed health" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Card>
          <CardSubtitle>Feed source</CardSubtitle>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            <Badge tone="positive">demo</Badge>
          </div>
        </Card>
        <Card>
          <CardSubtitle>Last fetched</CardSubtitle>
          <div className="md-mono" style={{ fontSize: 14 }}>{fetchedAt ?? "—"}</div>
        </Card>
        <Card>
          <CardSubtitle>Matches (total)</CardSubtitle>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{matches.length}</div>
        </Card>
        <Card>
          <CardSubtitle>Status</CardSubtitle>
          <div className="md-mono" style={{ fontSize: 13 }}>
            {error ? (
              <span className="md-text-negative">error</span>
            ) : loading ? (
              "loading"
            ) : (
              <span className="md-text-positive">healthy</span>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Match Breakdown</CardTitle>
        <CardSubtitle>Counts by status</CardSubtitle>
        {loading && <Skeleton variant="list" count={3} />}
        <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
          <div>
            <div className="md-text-muted" style={{ fontSize: 11 }}>LIVE</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{counts.live}</div>
          </div>
          <div>
            <div className="md-text-muted" style={{ fontSize: 11 }}>UPCOMING</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{counts.upcoming}</div>
          </div>
          <div>
            <div className="md-text-muted" style={{ fontSize: 11 }}>FINISHED</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{counts.finished}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
