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
    const { amount } = body as { amount: number }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount" }, { status: 400 })
    }

    if (amount > 10000) {
      return NextResponse.json({ error: "Maximum deposit is $10,000" }, { status: 400 })
    }

    // Get current bankroll
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("bankroll")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 })
    }

    const currentBankroll = profile?.bankroll ?? 0
    const newBalance = currentBankroll + amount

    // Update bankroll
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ bankroll: newBalance })
      .eq("id", user.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    return NextResponse.json({ success: true, newBalance })
  } catch (err) {
    console.error("[wallet/deposit] error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
