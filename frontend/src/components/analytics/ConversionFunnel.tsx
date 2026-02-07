import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ConversionFunnelItem } from '../../types'

interface Props {
  data: ConversionFunnelItem[]
}

const STAGE_COLORS: Record<string, string> = {
  unaware: '#9CA3AF',
  skeptical: '#EF4444',
  trialing: '#F59E0B',
  adopting: '#3B82F6',
  advocating: '#10B981',
}

export default function ConversionFunnel({ data }: Props) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <p className="text-gray-400 text-sm">No sentiment data available. Record sentiment scores to see the funnel.</p>
  }

  const chartData = data.map((d) => ({
    ...d,
    stage: d.stage.charAt(0).toUpperCase() + d.stage.slice(1),
    fill: STAGE_COLORS[d.stage] || '#6B7280',
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="stage" type="category" width={100} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
