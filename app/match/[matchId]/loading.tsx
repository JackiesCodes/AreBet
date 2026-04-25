export default function MatchDetailLoading() {
  return (
    <div className="md-page">
      {/* Hero skeleton */}
      <div className="match-hero" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
        <div className="md-skel md-skel--list" style={{ width: 160, height: 20, borderRadius: 8, marginBottom: 16 }} />
        <div className="match-hero-scoreboard" style={{ opacity: 0.4 }}>
          <div className="match-hero-team match-hero-team--home">
            <div className="md-skel" style={{ width: 48, height: 48, borderRadius: "50%", marginBottom: 8 }} />
            <div className="md-skel md-skel--list" style={{ width: 100, height: 16 }} />
          </div>
          <div className="match-hero-score">
            <span className="match-hero-score-sep">vs</span>
          </div>
          <div className="match-hero-team match-hero-team--away">
            <div className="md-skel" style={{ width: 48, height: 48, borderRadius: "50%", marginBottom: 8 }} />
            <div className="md-skel md-skel--list" style={{ width: 100, height: 16 }} />
          </div>
        </div>
      </div>

      {/* Intelligence bar skeleton */}
      <div className="md-skel md-skel--list" style={{ height: 80, borderRadius: 12, marginBottom: 16 }} />

      {/* Tabs skeleton */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="md-skel" style={{ width: 64, height: 34, borderRadius: 8 }} />
        ))}
      </div>

      {/* Tab content skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="md-skel md-skel--list" style={{ height: 56, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  )
}
