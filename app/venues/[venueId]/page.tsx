import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { searchVenuesByName, fetchFixturesByVenue } from "@/lib/api-football/client"
import { mapFixtureToMatch } from "@/lib/api-football/mapper"
import { formatTime, formatShortDate } from "@/lib/utils/time"
import type { Match } from "@/types/match"

interface PageProps {
  params: Promise<{ venueId: string }>
}

export default async function VenuePage({ params }: PageProps) {
  const { venueId } = await params
  const id = Number.parseInt(venueId, 10)
  if (Number.isNaN(id)) notFound()

  // API-Football doesn't have a /venues?id= endpoint exposed on all plans,
  // so we fetch upcoming fixtures by venue and derive info from there.
  const fixtureData = await fetchFixturesByVenue(id, 10).catch(() => [])
  const matches: Match[] = fixtureData.map(mapFixtureToMatch)

  // Try to derive venue info from fixture data
  const raw = fixtureData[0]
  const venueName = raw?.fixture?.venue?.name ?? `Venue #${id}`
  const venueCity = raw?.fixture?.venue?.city ?? null

  return (
    <div className="venue-page">
      <div className="venue-page-back">
        <Link href="/">← Back</Link>
      </div>

      {/* Hero */}
      <div className="venue-hero">
        <div className="venue-hero-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="12" cy="12" rx="10" ry="6" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="6" x2="12" y2="18" />
          </svg>
        </div>
        <div className="venue-hero-info">
          <h1 className="venue-hero-name">{venueName}</h1>
          {venueCity && <div className="venue-hero-city">{venueCity}</div>}
        </div>
      </div>

      {/* Upcoming fixtures at this venue */}
      {matches.length > 0 ? (
        <section className="venue-section">
          <h2 className="venue-section-title">Upcoming at this venue</h2>
          <div className="venue-fixture-list">
            {matches.map((m) => (
              <Link key={m.id} href={`/match/${m.id}`} className="venue-fixture-row">
                <span className="venue-fixture-teams">
                  <span className="venue-fixture-team">
                    {m.home.logo && (
                      <Image src={m.home.logo} alt={m.home.name} width={16} height={16} unoptimized />
                    )}
                    {m.home.name}
                  </span>
                  <span className="venue-fixture-vs">vs</span>
                  <span className="venue-fixture-team">
                    {m.away.logo && (
                      <Image src={m.away.logo} alt={m.away.name} width={16} height={16} unoptimized />
                    )}
                    {m.away.name}
                  </span>
                </span>
                <span className="venue-fixture-meta">
                  <span className="venue-fixture-league">{m.league}</span>
                  <span className="venue-fixture-time">{formatShortDate(m.kickoffISO)} · {formatTime(m.kickoffISO)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="venue-empty">No upcoming fixtures found at this venue.</div>
      )}
    </div>
  )
}
