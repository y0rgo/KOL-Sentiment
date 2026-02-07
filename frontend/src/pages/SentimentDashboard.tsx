import { useEffect, useState } from 'react'
import { fetchConversionFunnel } from '../api/client'
import ConversionFunnel from '../components/analytics/ConversionFunnel'
import type { ConversionFunnelItem } from '../types'

export default function SentimentDashboard() {
  const [funnelData, setFunnelData] = useState<ConversionFunnelItem[]>([])

  useEffect(() => {
    fetchConversionFunnel().then(setFunnelData).catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Sentiment Analytics</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Conversion Funnel</h2>
        <ConversionFunnel data={funnelData} />
      </div>
    </div>
  )
}
