import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';

const routeTitles: Record<string, string> = {
  '/master-list': 'Master List',
  '/import': 'Import Data',
  '/discovery': 'Discovery Portal',
  '/review-queue': 'Review Queue',
  '/dashboard': 'Dashboard',
  '/tier-config': 'Tier Configuration',
  '/priority-matrix': 'Priority Matrix',
  '/settings': 'Settings',
};

const Header: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (): string => {
    if (routeTitles[location.pathname]) {
      return routeTitles[location.pathname];
    }
    if (location.pathname.startsWith('/persona/')) return 'Physician Profile';
    const match = Object.keys(routeTitles).find((path) =>
      location.pathname.startsWith(path)
    );
    return match ? routeTitles[match] : 'KOL Intelligence Platform';
  };

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-base font-semibold text-gray-800">{getPageTitle()}</h1>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search physicians..."
            className="w-52 h-8 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50/50 text-sm
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell size={18} className="text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500" />
        </button>

        <div className="w-8 h-8 rounded-full bg-navy-500 flex items-center justify-center text-white text-xs font-semibold cursor-pointer ring-2 ring-white shadow-sm">
          VP
        </div>
      </div>
    </header>
  );
};

export default Header;
