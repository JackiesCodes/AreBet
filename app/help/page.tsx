"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils/cn"

const FAQS = [
  {
    q: "What is AreBet?",
    a: "AreBet is a football betting intelligence platform. We aggregate live matches, model predictions, and bookmaker odds in one command centre so you can spot value faster.",
  },
  {
    q: "Is AreBet free?",
    a: "Yes — you can browse live matches and basic predictions on the Free tier. Pro and Elite plans unlock the full prediction model, odds comparison, and advanced analytics.",
  },
  {
    q: "How are confidence scores calculated?",
    a: "Confidence combines our expected-goals model with market implied probability, form, and head-to-head records. Scores above 70% are considered high confidence.",
  },
  {
    q: "Where does match data come from?",
    a: "Match data is sourced live from API-Football, covering 900+ leagues worldwide. Fixtures, lineups, live scores, player stats, and bookmaker odds all update in real time via our polling engine.",
  },
  {
    q: "How often does the data update?",
    a: "Live matches poll every 10 seconds. When no live matches are on, the feed refreshes every 30 seconds. The app pauses updates automatically when you switch tabs to save bandwidth.",
  },
  {
    q: "Can I use AreBet on mobile?",
    a: "Yes. AreBet is a Progressive Web App — install it from your browser on iOS or Android for an app-like experience with offline support and push notifications.",
  },
  {
    q: "Is AreBet a betting operator?",
    a: "No. AreBet is a pure information and analytics platform. We do not accept wagers; we help you understand them.",
  },
  {
    q: "How do I track my bets?",
    a: "Use the Bet Tracker in your Dashboard to log stakes, odds, and outcomes. Your bet history is saved to your account and synced across devices when you're signed in.",
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
