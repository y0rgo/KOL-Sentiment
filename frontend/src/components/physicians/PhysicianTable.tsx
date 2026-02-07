import { useNavigate } from 'react-router-dom'
import type { Physician } from '../../types'
import { getTierLabel, getTierColor } from '../../utils/tierUtils'

interface Props {
  physicians: Physician[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function PhysicianTable({ physicians, total, page, pageSize, onPageChange }: Props) {
  const navigate = useNavigate()
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Institution</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Specialty</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {physicians.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/physicians/${p.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-navy">{p.last_name}, {p.first_name}</span>
                  {p.credentials && <span className="text-gray-400 ml-1">{p.credentials}</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.institution_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{p.specialty || '—'}</td>
                <td className="px-4 py-3">
                  {p.tier ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTierColor(p.tier)}`}>
                      {getTierLabel(p.tier)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.state || '—'}</td>
              </tr>
            ))}
            {physicians.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No physicians found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
