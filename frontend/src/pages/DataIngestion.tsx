import { useState } from 'react'
import { importPhysicians } from '../api/client'
import type { PhysicianImportResult } from '../types'

export default function DataIngestion() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<PhysicianImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await importPhysicians(file)
      setResult(res)
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Data Ingestion</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-navy mb-4">Import Physicians (CSV)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a CSV file with columns: npi, first_name, last_name, credentials, specialty, institution_name, practice_type, city, state
        </p>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-4 py-2 bg-teal text-white rounded-md hover:bg-teal-600 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        {result && (
          <div className="bg-gray-50 rounded-md p-4 text-sm">
            <p><strong>Total rows:</strong> {result.total_rows}</p>
            <p><strong>Created:</strong> {result.created}</p>
            <p><strong>Updated:</strong> {result.updated}</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <strong>Errors:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-red-600">{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
