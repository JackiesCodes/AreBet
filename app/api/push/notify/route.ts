/**
 * POST /api/push/notify
 * Sends a Web Push notification to all stored subscriptions.
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT env vars.
 * Body: { title: string, body: string, tag?: string, url?: string, secret: string }
 *
 * The `secret` must match PUSH_NOTIFY_SECRET to prevent abuse.
 */
import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@/lib/supabase/server"

function getVapidConfig() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const sub = process.env.VAPID_SUBJECT ?? "mailto:admin@arebet.com"
  if (!pub || !priv) throw new Error("VAPID keys not configured")
  return { pub, priv, sub }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      title: string
      body: string
      tag?: string
      url?: string
      secret?: string
    }

    // Basic auth guard — internal use only
    const secret = process.env.PUSH_NOTIFY_SECRET
    if (secret && body.secret !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { pub, priv, sub } = getVapidConfig()
    webpush.setVapidDetails(sub, pub, priv)

    const supabase = await createClient()
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")

    if (!subs?.length) return NextResponse.json({ sent: 0 })

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      tag: body.tag ?? `arebet-${Date.now()}`,
      url: body.url ?? "/",
    })

    const results = await Promise.allSettled(
      (subs as Array<{ subscription: string }>).map((row) => {
        const sub = JSON.parse(row.subscription) as webpush.PushSubscription
        return webpush.sendNotification(sub, payload)
      }),
    )

    const sent = results.filter((r: PromiseSettledResult<unknown>) => r.status === "fulfilled").length
    return NextResponse.json({ sent })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("VAPID")) {
      return NextResponse.json(
        { error: "VAPID keys not configured. Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT to .env.local" },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
