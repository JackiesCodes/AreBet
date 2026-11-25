import { NextResponse } from "next/server"
import { fetchMatchFeed } from "@/lib/services/matches"
import { buildMockMatchFeed } from "@/lib/services/mock-matches"

export const dynamic = "force-dynamic"
export const revalidate = 0

const useMock =
  process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true" ||
  !process.env.API_FOOTBALL_KEY

export async function GET() {
  if (useMock) {
    return NextResponse.json(buildMockMatchFeed())
  }

  try {
    const feed = await fetchMatchFeed()
    return NextResponse.json(feed)
  } catch (err) {
    // Fall back to mock data if the real API fails
    console.error("[api/matches] real feed failed, falling back to mock:", err)
    return NextResponse.json(buildMockMatchFeed())
  }
}
