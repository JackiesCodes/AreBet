"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface EdgePoint {
  market: string
  edge: number // model probability minus market probability
}

interface ValueEdgeChartProps {
  data: EdgePoint[]
  height?: number
}

export function ValueEdgeChart({ data, height = 220 }: ValueEdgeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="market" stroke="rgba(255,255,255,0.4)" fontSize={11} />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="edge" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.edge >= 0 ? "#22c55e" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
