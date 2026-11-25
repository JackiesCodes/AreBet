import { NextResponse } from "next/server"
import { getAndSnapshotOdds } from "@/lib/services/odds-snapshot"
import { getOddsProvider } from "@/lib/providers/odds"
import type { OddsQuoteWithSnapshot } from "@/lib/services/odds-snapshot"

export const dynamic = "force-dynamic"

const useMock =
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true" ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"

export async function GET(_req: Request, { params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId: fixtureIdParam } = await params
  const fixtureId = Number.parseInt(fixtureIdParam, 10)
  if (!Number.isFinite(fixtureId) || fixtureId <= 0) {
    return NextResponse.json({ error: "Invalid fixture id" }, { status: 400 })
  }

  // In demo mode skip Supabase snapshot writes — return quotes with stable fake IDs
  if (useMock) {
    const provider = getOddsProvider()
    const rawQuotes = await provider.getOddsForFixture(fixtureId)
    const quotes: OddsQuoteWithSnapshot[] = rawQuotes.map((q) => ({
      marketCode: q.marketCode,
      marketLabel: q.marketLabel,
      selectionCode: q.selectionCode,
      selectionLabel: q.selectionLabel,
      odds: q.odds,
      snapshotId: q.providerQuoteId,
    }))
    return NextResponse.json({ quotes })
  }

  try {
    const quotes = await getAndSnapshotOdds(fixtureId)
    return NextResponse.json({ quotes })
  } catch (err) {
    console.error("[odds] error:", err)
    // Fall back to un-snapshotted quotes on error
    try {
      const provider = getOddsProvider()
      const rawQuotes = await provider.getOddsForFixture(fixtureId)
      const quotes: OddsQuoteWithSnapshot[] = rawQuotes.map((q) => ({
        marketCode: q.marketCode,
        marketLabel: q.marketLabel,
        selectionCode: q.selectionCode,
        selectionLabel: q.selectionLabel,
        odds: q.odds,
        snapshotId: q.providerQuoteId,
      }))
      return NextResponse.json({ quotes })
    } catch {
      return NextResponse.json({ error: "Failed to load odds" }, { status: 500 })
    }
  }
}
