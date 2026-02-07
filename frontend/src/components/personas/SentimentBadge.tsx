import { getScoreBgColor, getCompositeColor } from '../../utils/sentimentUtils'

interface Props {
  label: string
  score: number | null
  isComposite?: boolean
}

export default function SentimentBadge({ label, score, isComposite = false }: Props) {
  const colorClass = isComposite ? getCompositeColor(score) : getScoreBgColor(score)

  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${colorClass}`}>
        {score ?? '—'}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
