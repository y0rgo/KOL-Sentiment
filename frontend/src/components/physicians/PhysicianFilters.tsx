interface Filters {
  tier: string
  state: string
  specialty: string
  search: string
  page: number
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

const TIERS = [
  { value: '', label: 'All Tiers' },
  { value: 'global_national', label: 'Global/National' },
  { value: 'regional_institutional', label: 'Regional/Institutional' },
  { value: 'local_community', label: 'Local/Community' },
  { value: 'rising_star', label: 'Rising Star' },
]

const STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR',
  'PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]

export default function PhysicianFilters({ filters, onChange }: Props) {
  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value, page: 1 })
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <input
        type="text"
        placeholder="Search name or NPI..."
        value={filters.search}
        onChange={(e) => update('search', e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 w-64"
      />
      <select
        value={filters.tier}
        onChange={(e) => update('tier', e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <select
        value={filters.state}
        onChange={(e) => update('state', e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        <option value="">All States</option>
        {STATES.filter(Boolean).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Specialty..."
        value={filters.specialty}
        onChange={(e) => update('specialty', e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 w-48"
      />
    </div>
  )
}
