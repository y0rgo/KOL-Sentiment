import { useState } from 'react'
import { createSentimentScore } from '../../api/client'
import ObjectionTagger from './ObjectionTagger'
import { OBJECTION_OPTIONS } from '../../types'

interface Props {
  physicianId: string
  onClose: () => void
  onSaved: () => void
}

export default function SentimentScoreInput({ physicianId, onClose, onSaved }: Props) {
  const [diseaseBeliefScore, setDiseaseBeliefScore] = useState(3)
  const [productPerceptionScore, setProductPerceptionScore] = useState(3)
  const [behavioralReadinessScore, setBehavioralReadinessScore] = useState(3)
  const [objectionsTagged, setObjectionsTagged] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [scoredBy, setScoredBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      await createSentimentScore({
        physician_id: physicianId,
        disease_belief_score: diseaseBeliefScore,
        product_perception_score: productPerceptionScore,
        behavioral_readiness_score: behavioralReadinessScore,
        objections_tagged: objectionsTagged.length > 0 ? objectionsTagged : undefined,
        notes: notes || undefined,
        scored_by: scoredBy || undefined,
      })
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to save score')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-navy">Record Sentiment Score</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-5">
          {/* Disease Belief */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disease Belief: <span className="text-teal font-bold">{diseaseBeliefScore}</span>
            </label>
            <input
              type="range"
              min={1} max={5} step={1}
              value={diseaseBeliefScore}
              onChange={(e) => setDiseaseBeliefScore(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 — Unaware</span><span>5 — Deep understanding</span>
            </div>
          </div>

          {/* Product Perception */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Perception: <span className="text-teal font-bold">{productPerceptionScore}</span>
            </label>
            <input
              type="range"
              min={1} max={5} step={1}
              value={productPerceptionScore}
              onChange={(e) => setProductPerceptionScore(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 — Negative</span><span>5 — Strong advocate</span>
            </div>
          </div>

          {/* Behavioral Readiness */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Behavioral Readiness: <span className="text-teal font-bold">{behavioralReadinessScore}</span>
            </label>
            <input
              type="range"
              min={1} max={5} step={1}
              value={behavioralReadinessScore}
              onChange={(e) => setBehavioralReadinessScore(Number(e.target.value))}
              className="w-full accent-teal"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 — No prescribing</span><span>5 — First-line prescriber</span>
            </div>
          </div>

          {/* Objection Tagger */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Objections / Barriers</label>
            <ObjectionTagger selected={objectionsTagged} onChange={setObjectionsTagged} />
          </div>

          {/* Scored By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scored By</label>
            <input
              type="text"
              value={scoredBy}
              onChange={(e) => setScoredBy(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Optional notes about this assessment..."
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm bg-teal text-white rounded-md hover:bg-teal-600 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Score'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
