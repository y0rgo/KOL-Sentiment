import type { EngagementDomain } from '../../types'
import { formatDate, formatEngagementType } from '../../utils/formatters'

interface Props {
  engagement: EngagementDomain
}

export default function EngagementTimeline({ engagement }: Props) {
  if (engagement.total_engagements === 0) {
    return <p className="text-gray-400 text-sm">No engagements recorded</p>
  }

  return (
    <div>
      <div className="flex gap-4 mb-4 text-sm">
        <div><span className="text-gray-500">Total:</span> <span className="font-medium">{engagement.total_engagements}</span></div>
        <div><span className="text-gray-500">Last:</span> <span className="font-medium">{formatDate(engagement.last_engagement_date)}</span></div>
      </div>
      {Object.keys(engagement.by_type).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(engagement.by_type).map(([type, count]) => (
            <span key={type} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {formatEngagementType(type)}: {count}
            </span>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {engagement.recent.slice(0, 5).map((e, i) => (
          <div key={i} className="text-sm flex items-center gap-3 border-l-2 border-navy-200 pl-3">
            <span className="text-gray-400 text-xs w-20">{formatDate(e.date as string)}</span>
            <span className="font-medium text-gray-700">{formatEngagementType(e.type as string)}</span>
            {e.channel ? <span className="text-gray-500">({String(e.channel)})</span> : null}
            {e.topic ? <span className="text-gray-400 truncate max-w-xs">— {String(e.topic)}</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
