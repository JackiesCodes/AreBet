import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  searchTeamsByName,
  searchLeaguesByName,
  searchPlayersByName,
  searchCoachesByName,
  searchVenuesByName,
  fetchFixturesByTeam,
  fetchRecentFixturesByTeam,
  fetchFixturesByLeague,
  fetchFixturesByVenue,
  fetchPlayerStatsByTeam,
  currentSeason,
} from "@/lib/api-football/client"
import { mapFixtureToMatch } from "@/lib/api-football/mapper"
import type { Match } from "@/types/match"
import type { ApiPlayerStat } from "@/lib/api-football/types"

export const dynamic = "force-dynamic"

// ── Types ─────────────────────────────────────────────────────────────────────

export type EntityType = "team" | "player" | "league" | "coach" | "venue"

export interface SearchEntity {
  type: EntityType
  id: number
  name: string
  image: string | null
  meta: string
}

// ── League popularity tiers ───────────────────────────────────────────────────
const LEAGUE_POP: Record<number, number> = {
  2: 100, 3: 95, 848: 88,
  39: 90, 140: 90, 135: 90, 78: 90, 61: 90,
  1: 88, 4: 86, 5: 80, 6: 78, 10: 75,
  45: 78, 48: 76, 143: 74, 137: 74, 81: 74, 66: 74,
  94: 72, 88: 72, 144: 70, 207: 68,
  119: 65, 113: 65, 103: 65, 106: 65, 218: 64,
  13: 82, 11: 78, 71: 72, 73: 65, 128: 70, 239: 65,
  253: 68, 262: 64,
  169: 60, 188: 58, 17: 56,
}

function leaguePop(id: number | null | undefined): number {
  return id ? (LEAGUE_POP[id] ?? 5) : 5
}

function nameMatch(name: string, q: string): number {
  const n = name.toLowerCase()
  if (n === q) return 3
  if (n.startsWith(q)) return 2
  if (n.includes(q)) return 1
  return 0
}

function relevanceScore(match: Match, q: string): number {
  const ql = q.toLowerCase()
  const ns = Math.max(
    nameMatch(match.home.name, ql),
    nameMatch(match.away.name, ql),
    nameMatch(match.league, ql),
  )
  return ns * 1000 + leaguePop(match.leagueId)
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json({ entities: [], matches: [] })

  const ql = q.toLowerCase()
  const season = currentSeason()

  try {
    // ── Step 1: search teams + leagues (always) ─────────────────────────────
    // Player/coach/venue name search only if >=4 chars (API-Football minimum)
    const [teams, leagues, directPlayers, coaches, venues] = await Promise.all([
      searchTeamsByName(q).catch((e) => { console.error("[search] teams:", e.message); return [] }),
      searchLeaguesByName(q).catch((e) => { console.error("[search] leagues:", e.message); return [] }),
      q.length >= 4
        ? searchPlayersByName(q, season).catch((e) => { console.error("[search] players:", e.message); return [] })
        : Promise.resolve([] as ApiPlayerStat[]),
      q.length >= 3
        ? searchCoachesByName(q).catch((e) => { console.error("[search] coaches:", e.message); return [] })
        : Promise.resolve([]),
      q.length >= 3
        ? searchVenuesByName(q).catch((e) => { console.error("[search] venues:", e.message); return [] })
        : Promise.resolve([]),
    ])

    // ── Step 2: fetch squad players from top matched teams ──────────────────
    // This lets "Manchester" show Man City/United players even if global player
    // search returns nothing (Betway-style: team search surfaces players too)
    const squadResults: ApiPlayerStat[] = teams.length > 0
      ? (await Promise.all(
          teams.slice(0, 2).map((t) =>
            fetchPlayerStatsByTeam(t.team.id, season).catch(() => [] as ApiPlayerStat[])
          )
        )).flat()
      : []

    // Merge: direct name matches first, then squad players filtered by name
    const playerMap = new Map<number, ApiPlayerStat>()
    for (const p of directPlayers) playerMap.set(p.player.id, p)
    for (const p of squadResults) {
      if (!playerMap.has(p.player.id) && nameMatch(p.player.name, ql) > 0) {
        playerMap.set(p.player.id, p)
      }
    }
    // If team matched but no player name match, show top squad players anyway
    if (playerMap.size === 0 && squadResults.length > 0) {
      for (const p of squadResults.slice(0, 6)) {
        playerMap.set(p.player.id, p)
      }
    }

    const players = [...playerMap.values()]
      .sort((a, b) => {
        const aScore = nameMatch(a.player.name, ql) * 1000 + (a.statistics?.[0]?.games?.appearences ?? 0)
        const bScore = nameMatch(b.player.name, ql) * 1000 + (b.statistics?.[0]?.games?.appearences ?? 0)
        return bScore - aScore
      })

    console.log(
      `[search] q="${q}" teams=${teams.length} leagues=${leagues.length} ` +
      `directPlayers=${directPlayers.length} squadPlayers=${squadResults.length} ` +
      `coaches=${coaches.length} venues=${venues.length}`
    )

    // ── Step 3: build entity list ──────────────────────────────────────────
    const entities: SearchEntity[] = []

    // Teams — up to 5
    for (const t of teams.slice(0, 5)) {
      entities.push({
        type: "team",
        id: t.team.id,
        name: t.team.name,
        image: t.team.logo ?? null,
        meta: t.venue?.city
          ? `${t.venue.city}${t.team.country ? ` · ${t.team.country}` : ""}`
          : (t.team.country ?? ""),
      })
    }

    // Leagues — up to 4, sorted by popularity
    for (const l of leagues
      .slice(0, 8)
      .sort((a, b) => leaguePop(b.league.id) - leaguePop(a.league.id))
      .slice(0, 4)
    ) {
      entities.push({
        type: "league",
        id: l.league.id,
        name: l.league.name,
        image: l.league.logo ?? null,
        meta: l.country.name,
      })
    }

    // Players — up to 4
    for (const p of players.slice(0, 4)) {
      const stat = p.statistics?.[0]
      const club = stat?.team?.name ?? ""
      const leagueName = stat?.league?.name ?? ""
      entities.push({
        type: "player",
        id: p.player.id,
        name: p.player.name,
        image: p.player.photo ?? null,
        meta: [club, leagueName].filter(Boolean).join(" · "),
      })
    }

    // Coaches — up to 2
    for (const c of coaches.slice(0, 2)) {
      entities.push({
        type: "coach",
        id: c.id,
        name: c.name,
        image: c.photo ?? null,
        meta: c.team?.name ?? "",
      })
    }

    // Venues — up to 3
    for (const v of venues.slice(0, 3)) {
      entities.push({
        type: "venue",
        id: v.id,
        name: v.name,
        image: v.image ?? null,
        meta: [v.city, v.country].filter(Boolean).join(", "),
      })
    }

    // ── Step 4: derive all fixture sources ────────────────────────────────
    // Team IDs: from direct team matches first
    const fixtureTeamIds = new Set(teams.slice(0, 4).map((t) => t.team.id))

    // Player club IDs: when no team name matched (e.g. "Haaland" → Man City)
    // statistics may be empty for some players — fall back to any populated entry
    if (fixtureTeamIds.size === 0) {
      for (const p of players.slice(0, 3)) {
        const stat = p.statistics?.find((s) => s.team?.id)
        if (stat?.team?.id) fixtureTeamIds.add(stat.team.id)
      }
    }

    // Coach team ID
    if (fixtureTeamIds.size === 0 && coaches[0]?.team?.id) {
      fixtureTeamIds.add(coaches[0].team.id)
    }

    const fixtureLeagueIds = leagues.slice(0, 2).map((l) => l.league.id)
    const fixtureVenueIds  = venues.slice(0, 2).map((v) => v.id)

    console.log(
      `[search] fixture sources — teams=${[...fixtureTeamIds].join(",")} ` +
      `leagues=${fixtureLeagueIds.join(",")} venues=${fixtureVenueIds.join(",")}`
    )

    if (fixtureTeamIds.size === 0 && fixtureLeagueIds.length === 0 && fixtureVenueIds.length === 0) {
      return NextResponse.json({ entities, matches: [] })
    }

    // Fetch both upcoming and recent matches for each team so we always have results
    const empty = (): Promise<never[]> => Promise.resolve([])
    const fixtureResults = await Promise.allSettled([
      ...[...fixtureTeamIds].flatMap((id) => [
        fetchFixturesByTeam(id, 8).catch(empty),
        fetchRecentFixturesByTeam(id, 5).catch(empty),
      ]),
      ...fixtureLeagueIds.map((id) => fetchFixturesByLeague(id, season, 10).catch(empty)),
      ...fixtureVenueIds.map((id) => fetchFixturesByVenue(id, 8).catch(empty)),
    ])

    const seen = new Set<number>()
    const matches: Match[] = []

    for (const result of fixtureResults) {
      if (result.status !== "fulfilled") continue
      for (const f of result.value) {
        if (seen.has(f.fixture.id)) continue
        seen.add(f.fixture.id)
        matches.push(mapFixtureToMatch(f))
      }
    }

    matches.sort((a, b) => {
      const aLive = a.status === "LIVE" ? 1 : 0
      const bLive = b.status === "LIVE" ? 1 : 0
      if (aLive !== bLive) return bLive - aLive
      const sd = relevanceScore(b, q) - relevanceScore(a, q)
      if (sd !== 0) return sd
      const ta = new Date(a.kickoffISO).getTime()
      const tb = new Date(b.kickoffISO).getTime()
      return a.status === "FINISHED" ? tb - ta : ta - tb
    })

    console.log(`[search] returning entities=${entities.length} matches=${matches.length}`)
    return NextResponse.json({ entities, matches: matches.slice(0, 20) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/search] unhandled error:", message)
    return NextResponse.json({ entities: [], matches: [], error: message }, { status: 200 })
  }
}
