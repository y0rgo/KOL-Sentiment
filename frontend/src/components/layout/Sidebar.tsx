import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '◈' },
  { path: '/physicians', label: 'Physicians', icon: '◉' },
  { path: '/sentiment', label: 'Sentiment', icon: '◐' },
  { path: '/network', label: 'Network', icon: '◎' },
  { path: '/engagements', label: 'Engagements', icon: '◇' },
  { path: '/simulator', label: 'Simulator', icon: '◆' },
  { path: '/data', label: 'Data', icon: '▦' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-navy text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-navy-400">
        <h1 className="text-lg font-bold tracking-tight">KOL Sentinel</h1>
        <p className="text-xs text-navy-200 mt-0.5">Persona Intelligence</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-navy-400 text-white font-medium'
                  : 'text-navy-200 hover:bg-navy-600 hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
