import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Upload,
  Search,
  Inbox,
  BarChart3,
  Sliders,
  Target,
  Settings,
} from 'lucide-react';
import { fetchReviewQueueStats } from '../../api/client';
import { Logo } from '../ui/Logo';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetchReviewQueueStats();
        const stats = response.data as { total_pending: number };
        setPendingCount(stats.total_pending);
      } catch {
        // Silently fail
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 60_000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { label: 'Master List', path: '/master-list', icon: Home },
    { label: 'Import Data', path: '/import', icon: Upload },
    { label: 'Discovery Portal', path: '/discovery', icon: Search },
    { label: 'Review Queue', path: '/review-queue', icon: Inbox, badge: pendingCount },
    { label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { label: 'Priority Matrix', path: '/priority-matrix', icon: Target },
    { label: 'Tier Config', path: '/tier-config', icon: Sliders },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string): boolean => location.pathname.startsWith(path);

  return (
    <aside className="w-64 h-screen flex flex-col bg-[#1B2A4A] text-white fixed left-0 top-0 z-30">
      {/* Logo + Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <Logo size={32} />
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight leading-tight">KOL Intelligence</span>
          <span className="text-[10px] font-medium text-white/40 tracking-widest uppercase">Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${
                  active
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon size={18} className={active ? 'text-brand-400' : 'text-white/40'} />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 font-medium tracking-wide">
          Identify. Prioritize. Engage.
        </p>
        <p className="text-[10px] text-white/20 mt-0.5">v2.0.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
