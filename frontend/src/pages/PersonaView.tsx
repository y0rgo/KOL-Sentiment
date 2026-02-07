import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePersona } from '../hooks/usePersona'
import PersonaCard from '../components/personas/PersonaCard'
import SentimentScoreInput from '../components/sentiment/SentimentScoreInput'

export default function PersonaView() {
  const { id } = useParams<{ id: string }>()
  const { persona, loading, error, reload } = usePersona(id)
  const [showSentimentModal, setShowSentimentModal] = useState(false)

  if (loading) return <div className="text-gray-500">Loading persona...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>
  if (!persona) return <div className="text-gray-500">Physician not found</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">
          {persona.identity.first_name} {persona.identity.last_name}
          {persona.identity.credentials && (
            <span className="text-gray-500 font-normal">, {persona.identity.credentials}</span>
          )}
        </h1>
        <button
          onClick={() => setShowSentimentModal(true)}
          className="px-4 py-2 bg-teal text-white rounded-md hover:bg-teal-600 transition-colors text-sm font-medium"
        >
          Record Sentiment
        </button>
      </div>
      <PersonaCard persona={persona} />
      {showSentimentModal && id && (
        <SentimentScoreInput
          physicianId={id}
          onClose={() => setShowSentimentModal(false)}
          onSaved={() => {
            setShowSentimentModal(false)
            reload()
          }}
        />
      )}
    </div>
  )
}
