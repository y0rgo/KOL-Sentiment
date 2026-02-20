import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Upload,
  Search,
  Inbox,
  BarChart3,
  Sliders,
  Settings,
} from 'lucide-react';
import { reviewQueueStats } from '../../mockData';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const pendingCount = reviewQueueStats.total_pending;

  const navItems: NavItem[] = [
    { label: 'Master List', path: '/master-list', icon: Home },
    { label: 'Import Data', path: '/import', icon: Upload },
    { label: 'Discovery Portal', path: '/discovery', icon: Search },
    { label: 'Review Queue', path: '/review-queue', icon: Inbox, badge: pendingCount },
    { label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { label: 'Tier Config', path: '/tier-config', icon: Sliders },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string): boolean => location.pathname.startsWith(path);

  return (
    <aside className="w-64 h-screen flex flex-col bg-[#1B2A4A] text-white fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-teal-400 flex items-center justify-center font-bold text-[#1B2A4A] text-sm">
          K
        </div>
        <span className="text-lg font-bold tracking-tight">KOL Platform</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${
                  active
                    ? 'bg-teal-500/20 text-teal-300'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon size={20} className={active ? 'text-teal-300' : 'text-white/50'} />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-teal-400 text-[#1B2A4A] text-xs font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10 text-xs text-white/40">
        v2.0 &middot; Static Demo
      </div>
    </aside>
  );
};

export default Sidebar;
