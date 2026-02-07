import type { PrescribingDomain } from '../../types'

interface Props {
  prescribing: PrescribingDomain
}

export default function PrescribingSnapshot({ prescribing }: Props) {
  if (prescribing.total_patients === 0) {
    return <p className="text-gray-400 text-sm">No prescribing data available</p>
  }

  return (
    <div className="text-sm">
      <p className="text-gray-600 mb-2">Total patients: <span className="font-medium">{prescribing.total_patients}</span></p>
      {prescribing.pa_rate !== null && (
        <p className="text-gray-600 mb-2">PA approval rate: <span className="font-medium">{prescribing.pa_rate.toFixed(1)}%</span></p>
      )}
      {prescribing.products.length > 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-medium text-gray-600 mb-1">By Product</h3>
          {prescribing.products.map((p, i) => (
            <div key={i} className="text-gray-500">
              {p.product_id as string}: {p.total_patients as number} patients, {p.new_starts as number} new starts
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
