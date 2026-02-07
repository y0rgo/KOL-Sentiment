import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { SentimentScore } from '../../types'

interface Props {
  scores: SentimentScore[]
}

export default function SentimentTrendChart({ scores }: Props) {
  if (scores.length === 0) {
    return <p className="text-gray-400 text-sm">No sentiment history to chart</p>
  }

  const data = [...scores].reverse().map((s) => ({
    date: s.assessment_date,
    'Disease Belief': s.disease_belief_score,
    'Product Perception': s.product_perception_score,
    'Behavioral Readiness': s.behavioral_readiness_score,
    Composite: s.composite_score,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 15]} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Disease Belief" stroke="#2A9D8F" strokeWidth={2} />
        <Line type="monotone" dataKey="Product Perception" stroke="#1B2A4A" strokeWidth={2} />
        <Line type="monotone" dataKey="Behavioral Readiness" stroke="#F59E0B" strokeWidth={2} />
        <Line type="monotone" dataKey="Composite" stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  )
}
