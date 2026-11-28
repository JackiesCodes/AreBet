"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils/cn"

const FAQS = [
  {
    q: "What is AreBet?",
    a: "AreBet is a demo football betting platform. Browse live and upcoming matches across 900+ leagues, add selections to your bet slip, and place singles or accumulators.",
  },
  {
    q: "How do I place a bet?",
    a: "Click any odds button on a match to add it to your bet slip. Open the slip from the top-right button, enter your stake, and hit Place Bet. You need to be signed in and have funds in your account.",
  },
  {
    q: "What is an accumulator?",
    a: "An accumulator (acca) combines multiple selections into one bet. All selections must win for the bet to pay out. Switch the bet slip to 'Acca' mode to see your combined odds and potential return.",
  },
  {
    q: "Where does match data come from?",
    a: "Match data covers 900+ leagues worldwide — fixtures, live scores, lineups, player stats, and odds all update in real time.",
  },
  {
    q: "How often does the data update?",
    a: "Live matches update every 10 seconds. When no live matches are on, the feed refreshes every 30 seconds. Updates pause automatically when you switch tabs.",
  },
  {
    q: "Can I use AreBet on mobile?",
    a: "Yes. AreBet is a Progressive Web App — install it from your browser on iOS or Android for a full app experience with push notifications.",
  },
  {
    q: "How do I claim a bonus?",
    a: "New members receive a 100% welcome bonus up to $200 on their first deposit. Visit the Promotions page for free bets, acca boosts, and ongoing offers.",
  },
  {
    q: "How do I track my bets?",
    a: "Go to My Bets to see your open wagers, settled results, and running profit/loss. Your history is synced across devices when you're signed in.",
  },
]

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="md-page">
      <PageHeader title="Help & FAQ" subtitle="Answers to common questions" />
      <div className="md-card">
        {FAQS.map((item, i) => (
          <div key={i} className="faq-item">
            <button
              type="button"
              className="faq-q"
              style={{ width: "100%", textAlign: "left" }}
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span>{item.q}</span>
              <span className="md-text-muted">{open === i ? "−" : "+"}</span>
            </button>
            <div className={cn("faq-a")} style={{ display: open === i ? "block" : "none" }}>
              {item.a}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
