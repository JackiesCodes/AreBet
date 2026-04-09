import { NextResponse } from "next/server"
import { fetchMatchFeed } from "@/lib/services/matches"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const feed = await fetchMatchFeed()
    return NextResponse.json(feed)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
