import { formatBarrierType } from '../../utils/sentimentUtils'

interface Props {
  barriers: Record<string, unknown>[]
}

export default function BarrierTags({ barriers }: Props) {
  if (barriers.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {barriers.map((b, i) => (
        <span
          key={i}
          className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium"
        >
          {formatBarrierType(b.type as string)}
          {b.severity === 'primary' && <span className="ml-1 text-orange-500">*</span>}
        </span>
      ))}
    </div>
  )
}
