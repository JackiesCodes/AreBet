"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PerfPoint {
  date: string
  roi: number
  winRate: number
}

interface PerformanceChartProps {
  data: PerfPoint[]
  height?: number
}

export function PerformanceChart({ data, height = 240 }: PerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="roi" stroke="#22c55e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="winRate" stroke="#60a5fa" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
