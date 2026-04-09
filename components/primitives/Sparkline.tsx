interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  area?: boolean
}

export function Sparkline({ values, width = 120, height = 32, area = true }: SparklineProps) {
  if (!values || values.length < 2) {
    return <svg className="md-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" />
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)

  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / span) * (height - 4) - 2
    return [x, y] as const
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${width.toFixed(1)},${height} L0,${height} Z`

  return (
    <svg className="md-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {area && <path className="md-spark-area" d={areaPath} />}
      <path className="md-spark-line" d={linePath} />
    </svg>
  )
}
