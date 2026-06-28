import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { bets, betType, accumStake } = body as {
      bets: Array<{
        fixtureId: number
        matchLabel: string
        league: string
        market: string
        marketLabel: string
        selection: string
        selectionLabel: string
        odds: number
        stake: number
        kickoffISO: string
      }>
      betType: "SINGLE" | "ACCUMULATOR"
      accumStake?: number
    }

    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: "No bets provided" }, { status: 400 })
    }

    // Validate stakes
    for (const bet of bets) {
      if (typeof bet.stake !== "number" || bet.stake <= 0) {
        return NextResponse.json({ error: "Invalid stake amount" }, { status: 400 })
      }
    }

    const totalStake = betType === "ACCUMULATOR" && accumStake
      ? accumStake
      : bets.reduce((sum, b) => sum + b.stake, 0)

    // Check bankroll
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("bankroll")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 })
    }

    const currentBankroll = profile?.bankroll ?? 0
    if (currentBankroll < totalStake) {
      return NextResponse.json(
        { error: `Insufficient funds. Your balance is $${currentBankroll.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Insert bets into user_bets table
    const rows = bets.map((bet) => ({
      user_id: user.id,
      fixture_id: bet.fixtureId,
      market: bet.market,
      selection: bet.selection,
      stake: betType === "ACCUMULATOR" ? (accumStake ?? totalStake) : bet.stake,
      odds: betType === "ACCUMULATOR"
        ? bets.reduce((product, b) => product * b.odds, 1)
        : bet.odds,
      result: "PENDING",
      bet_type: betType,
      match_label: bet.matchLabel,
      selection_label: bet.selectionLabel,
      market_label: bet.marketLabel,
      kickoff_iso: bet.kickoffISO,
    }))

    const insertRows = rows

    const { data: insertedBets, error: insertError } = await supabase
      .from("user_bets")
      .insert(insertRows)
      .select("id")

    if (insertError) {
      console.error("[bets/place] insert error:", insertError)
      return NextResponse.json({ error: "Failed to place bet" }, { status: 500 })
    }

    // Deduct stake from bankroll
    const { error: deductError } = await supabase
      .from("profiles")
      .update({ bankroll: currentBankroll - totalStake })
      .eq("id", user.id)

    if (deductError) {
      console.error("[bets/place] deduct error:", deductError)
      // Don't fail the whole request — bets are placed, just log the issue
    }

    const betIds = (insertedBets ?? []).map((b: { id: string }) => b.id)

    return NextResponse.json({ success: true, betIds })
  } catch (err) {
    console.error("[bets/place] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
