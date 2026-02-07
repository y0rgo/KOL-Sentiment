import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { TierDistribution as TierDistData } from '../../types'
import { getTierLabel, TIER_CHART_COLORS } from '../../utils/tierUtils'

interface Props {
  data: TierDistData[]
}

export default function TierDistribution({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">No tier data available. Import physicians to see distribution.</p>
  }

  const chartData = data.map((d) => ({
    name: getTierLabel(d.tier),
    value: d.count,
    color: TIER_CHART_COLORS[d.tier] || '#6B7280',
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}`}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
