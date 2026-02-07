import { useEffect, useState } from 'react'
import { fetchTierDistribution, fetchConversionFunnel, fetchGeographicCoverage } from '../api/client'
import TierDistribution from '../components/analytics/TierDistribution'
import ConversionFunnel from '../components/analytics/ConversionFunnel'
import GeographicCoverage from '../components/analytics/GeographicCoverage'
import type { TierDistribution as TierDist, ConversionFunnelItem, GeographicCoverageItem } from '../types'

export default function Dashboard() {
  const [tierData, setTierData] = useState<TierDist[]>([])
  const [funnelData, setFunnelData] = useState<ConversionFunnelItem[]>([])
  const [geoData, setGeoData] = useState<GeographicCoverageItem[]>([])

  useEffect(() => {
    fetchTierDistribution().then(setTierData).catch(() => {})
    fetchConversionFunnel().then(setFunnelData).catch(() => {})
    fetchGeographicCoverage().then(setGeoData).catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Portfolio Dashboard</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Tier Distribution</h2>
          <TierDistribution data={tierData} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-navy mb-4">Conversion Funnel</h2>
          <ConversionFunnel data={funnelData} />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-navy mb-4">Geographic Coverage</h2>
          <GeographicCoverage data={geoData} />
        </div>
      </div>
    </div>
  )
}
