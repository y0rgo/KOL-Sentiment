import type { Physician } from '../../types'
import { getTierLabel, getTierColor } from '../../utils/tierUtils'

interface Props {
  physician: Physician
}

export default function PersonaSummaryCard({ physician }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="font-medium text-navy">
        {physician.last_name}, {physician.first_name}
        {physician.credentials && <span className="text-gray-400 ml-1">{physician.credentials}</span>}
      </div>
      <div className="text-sm text-gray-500 mt-1">{physician.institution_name || '—'}</div>
      {physician.tier && (
        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${getTierColor(physician.tier)}`}>
          {getTierLabel(physician.tier)}
        </span>
      )}
    </div>
  )
}
