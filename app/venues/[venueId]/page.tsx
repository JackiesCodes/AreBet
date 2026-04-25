import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { fetchVenueById, fetchFixturesByVenue } from "@/lib/api-football/client"
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

  const [venueData, fixtureData] = await Promise.allSettled([
    fetchVenueById(id),
    fetchFixturesByVenue(id, 10),
  ])

  const venue = venueData.status === "fulfilled" ? venueData.value : null
  const fixtures = fixtureData.status === "fulfilled" ? fixtureData.value : []
  const matches: Match[] = fixtures.map(mapFixtureToMatch)

  // Derive name/city from fixtures as fallback if venue endpoint returns nothing
  const rawFixture = fixtures[0]
  const venueName = venue?.name ?? rawFixture?.fixture?.venue?.name ?? `Venue #${id}`
  const venueCity = venue?.city ?? rawFixture?.fixture?.venue?.city ?? null

  if (!venue && matches.length === 0) notFound()

  return (
    <div className="venue-page">
      <div className="venue-page-back">
        <Link href="/">← Back</Link>
      </div>

      {/* Hero */}
      <div className="venue-hero">
        {venue?.image ? (
          <div className="venue-hero-image-wrap">
            <Image
              src={venue.image}
              alt={venueName}
              width={400}
              height={180}
              unoptimized
              className="venue-hero-image"
            />
          </div>
        ) : (
          <div className="venue-hero-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <ellipse cx="12" cy="12" rx="10" ry="6" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="6" x2="12" y2="18" />
            </svg>
          </div>
        )}
        <div className="venue-hero-info">
          <h1 className="venue-hero-name">{venueName}</h1>
          {venueCity && <div className="venue-hero-city">{venueCity}</div>}
          {venue && (
            <div className="venue-hero-meta">
              {venue.capacity && (
                <span className="venue-hero-stat">
                  <span className="venue-hero-stat-val">{venue.capacity.toLocaleString()}</span>
                  <span className="venue-hero-stat-label">Capacity</span>
                </span>
              )}
              {venue.surface && (
                <span className="venue-hero-stat">
                  <span className="venue-hero-stat-val">{venue.surface}</span>
                  <span className="venue-hero-stat-label">Surface</span>
                </span>
              )}
              {venue.country && (
                <span className="venue-hero-stat">
                  <span className="venue-hero-stat-val">{venue.country}</span>
                  <span className="venue-hero-stat-label">Country</span>
                </span>
              )}
              {venue.address && (
                <span className="venue-hero-stat">
                  <span className="venue-hero-stat-val" style={{ fontSize: 11 }}>{venue.address}</span>
                  <span className="venue-hero-stat-label">Address</span>
                </span>
              )}
            </div>
          )}
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
