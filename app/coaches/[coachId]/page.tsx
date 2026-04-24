import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { fetchCoachById } from "@/lib/api-football/client"

interface PageProps {
  params: Promise<{ coachId: string }>
}

export default async function CoachPage({ params }: PageProps) {
  const { coachId } = await params
  const id = Number.parseInt(coachId, 10)
  if (Number.isNaN(id)) notFound()

  const coach = await fetchCoachById(id).catch(() => null)
  if (!coach) notFound()

  return (
    <div className="player-page">
      <div className="player-page-back">
        <Link href="/">← Back</Link>
      </div>

      {/* Hero */}
      <div className="player-hero">
        <div className="player-hero-photo">
          {coach.photo ? (
            <Image
              src={coach.photo}
              alt={coach.name}
              width={80}
              height={80}
              unoptimized
              className="player-hero-photo-img"
            />
          ) : (
            <span className="player-hero-initial">{coach.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="player-hero-info">
          <h1 className="player-hero-name">{coach.name}</h1>
          <div className="player-hero-meta">
            {coach.nationality && <span>{coach.nationality}</span>}
            {coach.age && <span>Age {coach.age}</span>}
            {coach.birth?.place && <span>{coach.birth.place}</span>}
          </div>
          {coach.team && (
            <div className="player-hero-league" style={{ marginTop: 6 }}>
              {coach.team.logo && (
                <Image src={coach.team.logo} alt={coach.team.name} width={16} height={16} unoptimized />
              )}
              <Link href={`/teams/${coach.team.id}`} style={{ color: "var(--primary)", fontWeight: 500 }}>
                {coach.team.name}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Career */}
      {coach.career && coach.career.length > 0 && (
        <section className="player-section">
          <h2 className="player-section-title">Career</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {coach.career.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                {c.team.logo && (
                  <Image src={c.team.logo} alt={c.team.name} width={22} height={22} unoptimized style={{ borderRadius: 3 }} />
                )}
                <Link href={`/teams/${c.team.id}`} style={{ fontWeight: 500, flex: 1 }}>
                  {c.team.name}
                </Link>
                <span style={{ color: "var(--text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>
                  {c.start.slice(0, 4)}{c.end ? ` – ${c.end.slice(0, 4)}` : " – present"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
