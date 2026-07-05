import { createServiceClient } from "@/lib/supabase/service"
import { fetchFixtureDetail } from "@/lib/api-football/client"
import { mapFixtureToMatch } from "@/lib/api-football/mapper"
import { getOrCreateWallet } from "@/lib/services/wallet"
import type { BetMarket } from "@/contexts/BetSlipContext"

type BetResult = "WIN" | "LOSS" | "PUSH" | "VOID"

function gradeSelection(
  market: string,
  selection: string,
  homeGoals: number,
  awayGoals: number
): BetResult {
  switch (market as BetMarket) {
    case "MATCH_WINNER": {
      const outcome = homeGoals > awayGoals ? "HOME" : homeGoals < awayGoals ? "AWAY" : "DRAW"
      return selection === outcome ? "WIN" : "LOSS"
    }
    case "BTTS": {
      const btts = homeGoals > 0 && awayGoals > 0
      return (selection === "YES") === btts ? "WIN" : "LOSS"
    }
    case "OVER_25":
      return homeGoals + awayGoals > 2.5 ? "WIN" : "LOSS"
    case "UNDER_25":
      return homeGoals + awayGoals < 2.5 ? "WIN" : "LOSS"
    case "DOUBLE_CHANCE": {
      const outcome = homeGoals > awayGoals ? "HOME" : homeGoals < awayGoals ? "AWAY" : "DRAW"
      const covered =
        (selection === "HOME_OR_DRAW" && (outcome === "HOME" || outcome === "DRAW")) ||
        (selection === "HOME_OR_AWAY" && (outcome === "HOME" || outcome === "AWAY")) ||
        (selection === "DRAW_OR_AWAY" && (outcome === "DRAW" || outcome === "AWAY"))
      return covered ? "WIN" : "LOSS"
    }
    default:
      // Unknown market — void rather than silently grade it wrong.
      return "VOID"
  }
}

/**
 * Grades every PENDING bet against a fixture and settles the wallet ledger
 * accordingly: WIN -> bet_credit for stake*odds, VOID/PUSH -> bet_void_refund
 * for the original stake, LOSS -> no ledger entry (stake was already
 * debited at placement). No-ops (not an error) if the fixture isn't
 * FINISHED yet — the cron simply retries on its next run.
 */
export async function settleFixture(fixtureId: number): Promise<{ settled: number; error?: string }> {
  const service = createServiceClient()

  const { data: pendingBets, error: fetchError } = await service
    .from("user_bets")
    .select("id, user_id, market, selection, stake, odds, currency, is_real_money")
    .eq("fixture_id", fixtureId)
    .eq("result", "PENDING")

  if (fetchError) {
    await logSettlementJob(fixtureId, "failed", 0, fetchError.message)
    return { settled: 0, error: fetchError.message }
  }

  if (!pendingBets || pendingBets.length === 0) {
    return { settled: 0 }
  }

  const fixture = await fetchFixtureDetail(fixtureId)
  if (!fixture) {
    await logSettlementJob(fixtureId, "failed", 0, "Fixture not found")
    return { settled: 0, error: "Fixture not found" }
  }

  const match = mapFixtureToMatch(fixture)
  if (match.status !== "FINISHED") {
    return { settled: 0 }
  }

  const { home: homeGoals, away: awayGoals } = match.score
  let settledCount = 0
  let lastError: string | undefined

  for (const bet of pendingBets) {
    const result = gradeSelection(bet.market, bet.selection, homeGoals, awayGoals)

    let ledgerTxnId: string | null = null

    if (result === "WIN" || result === "VOID" || result === "PUSH") {
      const wallet = await getOrCreateWallet(service, bet.user_id, bet.currency, bet.is_real_money)
      const payout = result === "WIN" ? bet.stake * bet.odds : bet.stake
      const { data: txn, error: txnError } = await service.rpc("apply_wallet_transaction", {
        p_wallet_id: wallet.id,
        p_type: result === "WIN" ? "bet_credit" : "bet_void_refund",
        p_amount: payout,
        p_reference_type: "bet",
        p_reference_id: bet.id,
      })

      if (txnError) {
        lastError = txnError.message
        continue // leave PENDING, retry on the next cron run
      }
      ledgerTxnId = (txn as { id: string }).id
    }

    const { error: updateError } = await service
      .from("user_bets")
      .update({
        result,
        settled_at: new Date().toISOString(),
        settlement_source: "auto",
        wallet_transaction_credit_id: ledgerTxnId,
      })
      .eq("id", bet.id)

    if (updateError) {
      lastError = updateError.message
      continue
    }

    settledCount++
  }

  await logSettlementJob(fixtureId, lastError ? "partial_failure" : "success", settledCount, lastError)
  return { settled: settledCount, error: lastError }
}

async function logSettlementJob(
  fixtureId: number,
  status: "success" | "partial_failure" | "failed",
  count: number,
  error?: string
): Promise<void> {
  const service = createServiceClient()
  await service.from("bet_settlement_jobs").insert({
    fixture_id: fixtureId,
    status,
    bets_settled_count: count,
    error: error ?? null,
  })
}
