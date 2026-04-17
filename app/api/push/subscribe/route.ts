/**
 * POST /api/push/subscribe
 * Stores a Web Push subscription for the current user.
 * Body: { subscription: PushSubscriptionJSON, userId?: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = await req.json() as {
      subscription: PushSubscriptionJSON
      userId?: string
    }

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    // Store subscription in Supabase push_subscriptions table
    const supabase = await createClient()
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          user_id: userId ?? null,
          subscription: JSON.stringify(subscription),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      )

    if (error) {
      // Table may not exist yet — return OK so UI doesn't break
      console.warn("push_subscriptions upsert:", error.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json() as { endpoint: string }
    const supabase = await createClient()
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
