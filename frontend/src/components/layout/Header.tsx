import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/physicians?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <input
          type="text"
          placeholder="Search physicians by name or NPI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        />
      </form>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">KOL Platform v0.1</span>
      </div>
    </header>
  )
}
