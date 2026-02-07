import { OBJECTION_OPTIONS } from '../../types'
import { formatBarrierType } from '../../utils/sentimentUtils'

interface Props {
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function ObjectionTagger({ selected, onChange }: Props) {
  const toggle = (objection: string) => {
    if (selected.includes(objection)) {
      onChange(selected.filter((o) => o !== objection))
    } else {
      onChange([...selected, objection])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OBJECTION_OPTIONS.map((obj) => (
        <button
          key={obj}
          type="button"
          onClick={() => toggle(obj)}
          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
            selected.includes(obj)
              ? 'bg-orange-100 border-orange-300 text-orange-700'
              : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
          }`}
        >
          {formatBarrierType(obj)}
        </button>
      ))}
    </div>
  )
}
