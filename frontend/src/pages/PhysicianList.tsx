import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePhysicians } from '../hooks/usePhysicians'
import PhysicianTable from '../components/physicians/PhysicianTable'
import PhysicianFilters from '../components/physicians/PhysicianFilters'

export default function PhysicianList() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    tier: '',
    state: '',
    specialty: '',
    search: searchParams.get('search') || '',
    page: 1,
  })

  const { data, loading, error } = usePhysicians(filters)

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Physicians</h1>
      <PhysicianFilters filters={filters} onChange={setFilters} />
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : data ? (
        <PhysicianTable
          physicians={data.items}
          total={data.total}
          page={data.page}
          pageSize={data.page_size}
          onPageChange={(p) => setFilters({ ...filters, page: p })}
        />
      ) : null}
    </div>
  )
}
