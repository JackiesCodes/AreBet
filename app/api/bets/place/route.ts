import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getOrCreateWallet } from "@/lib/services/wallet"
import { verifyOddsSnapshot } from "@/lib/services/odds-snapshot"
import { isRealMoneyEnabled } from "@/lib/config/feature-flags"
import type { BetMarket } from "@/contexts/BetSlipContext"

export const dynamic = "force-dynamic"

// Default currency until a per-user currency preference exists (tracked
// for Phase 2+ alongside multi-currency wallet UI).
const DEFAULT_CURRENCY = "BWP"

interface IncomingBet {
  fixtureId: number
  matchLabel: string
  league: string
  market: BetMarket
  marketLabel: string
  selection: string
  selectionLabel: string
  oddsSnapshotId: string
  stake: number
  kickoffISO: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { bets, betType, accumStake } = body as {
      bets: IncomingBet[]
      betType: "SINGLE" | "ACCUMULATOR"
      accumStake?: number
    }

    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      return NextResponse.json({ error: "No bets provided" }, { status: 400 })
    }

    for (const bet of bets) {
      if (typeof bet.stake !== "number" || bet.stake <= 0) {
        return NextResponse.json({ error: "Invalid stake amount" }, { status: 400 })
      }
      if (!bet.oddsSnapshotId) {
        return NextResponse.json({ error: "Missing odds snapshot — please refresh and try again." }, { status: 400 })
      }
    }

    const service = createServiceClient()

    // Block active self-exclusions (an expired end date lifts the block
    // even if nothing has flipped the status column — there's no expiry
    // cron for this yet).
    const { data: exclusion } = await service
      .from("self_exclusions")
      .select("id, ends_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (exclusion && (!exclusion.ends_at || new Date(exclusion.ends_at) > new Date())) {
      return NextResponse.json({ error: "Betting is unavailable for this account." }, { status: 403 })
    }

    // Verify every leg's odds snapshot server-side. This is the fix for
    // the previous behaviour of trusting a client-submitted `odds` number
    // verbatim — the authoritative price is whatever was captured in
    // odds_snapshots at the moment the odds were shown.
    const verifiedOdds: number[] = []
    for (const bet of bets) {
      const verified = await verifyOddsSnapshot({
        snapshotId: bet.oddsSnapshotId,
        fixtureId: bet.fixtureId,
        marketCode: bet.market,
        selectionCode: bet.selection,
      })
      if (!verified) {
        return NextResponse.json(
          { error: `Odds for ${bet.matchLabel} could not be verified — please refresh and try again.` },
          { status: 400 }
        )
      }
      verifiedOdds.push(verified.odds)
    }

    const totalStake = betType === "ACCUMULATOR" && accumStake
      ? accumStake
      : bets.reduce((sum, b) => sum + b.stake, 0)
    const combinedOdds = verifiedOdds.reduce((product, o) => product * o, 1)

    const isRealMoney = await isRealMoneyEnabled("sports")
    const wallet = await getOrCreateWallet(service, user.id, DEFAULT_CURRENCY, isRealMoney)

    // Not the source of truth (apply_wallet_transaction enforces this
    // atomically below) — just a friendlier error before we insert rows.
    if (wallet.cached_balance < totalStake) {
      return NextResponse.json(
        { error: `Insufficient funds. Your balance is ${wallet.cached_balance.toFixed(2)} ${DEFAULT_CURRENCY}.` },
        { status: 400 }
      )
    }

    const rows = bets.map((bet, i) => ({
      user_id: user.id,
      fixture_id: bet.fixtureId,
      market: bet.market,
      selection: bet.selection,
      stake: betType === "ACCUMULATOR" ? (accumStake ?? totalStake) : bet.stake,
      odds: betType === "ACCUMULATOR" ? combinedOdds : verifiedOdds[i],
      odds_snapshot_id: bet.oddsSnapshotId,
      result: "PENDING",
      bet_type: betType,
      match_label: bet.matchLabel,
      selection_label: bet.selectionLabel,
      market_label: bet.marketLabel,
      kickoff_iso: bet.kickoffISO,
      is_real_money: isRealMoney,
      currency: DEFAULT_CURRENCY,
    }))

    const { data: insertedBets, error: insertError } = await service
      .from("user_bets")
      .insert(rows)
      .select("id")

    if (insertError || !insertedBets) {
      console.error("[bets/place] insert error:", insertError)
      return NextResponse.json({ error: "Failed to place bet" }, { status: 500 })
    }

    const betIds = insertedBets.map((b: { id: string }) => b.id)

    // Single ledger debit for the whole placement (all legs of a singles
    // batch, or the one accumulator), row-locked and atomic — replaces
    // the previous racy read-then-write bankroll update.
    const { data: debitTxn, error: debitError } = await service.rpc("apply_wallet_transaction", {
      p_wallet_id: wallet.id,
      p_type: "bet_debit",
      p_amount: -totalStake,
      p_reference_type: "bet",
      p_reference_id: betIds[0],
      p_metadata: { bet_ids: betIds, bet_type: betType },
    })

    if (debitError || !debitTxn) {
      // Compensate: the bet rows are unfunded, remove them rather than
      // leave a PENDING bet with no corresponding stake taken.
      await service.from("user_bets").delete().in("id", betIds)
      console.error("[bets/place] debit error:", debitError)
      const message = debitError?.message?.includes("Insufficient balance")
        ? "Insufficient funds."
        : "Failed to place bet."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    await service
      .from("user_bets")
      .update({ wallet_transaction_debit_id: (debitTxn as { id: string }).id })
      .in("id", betIds)

    return NextResponse.json({ success: true, betIds })
  } catch (err) {
    console.error("[bets/place] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
