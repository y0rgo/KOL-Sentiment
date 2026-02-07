import type { GeographicCoverageItem } from '../../types'

interface Props {
  data: GeographicCoverageItem[]
}

export default function GeographicCoverage({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">No geographic data available. Import physicians to see coverage.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-gray-600">State</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Physicians</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Coverage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item) => (
            <tr key={item.state}>
              <td className="px-4 py-2 font-medium">{item.state}</td>
              <td className="px-4 py-2">{item.physician_count}</td>
              <td className="px-4 py-2">
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                  <div
                    className="bg-teal h-2 rounded-full"
                    style={{ width: `${Math.min((item.physician_count / Math.max(...data.map(d => d.physician_count))) * 100, 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
