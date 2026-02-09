import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';

const routeTitles: Record<string, string> = {
  '/master-list': 'Master List',
  '/import': 'Import Data',
  '/discovery': 'Discovery Portal',
  '/review-queue': 'Review Queue',
  '/dashboard': 'Dashboard',
  '/settings': 'Settings',
};

const Header: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (): string => {
    // Exact match first
    if (routeTitles[location.pathname]) {
      return routeTitles[location.pathname];
    }
    // Prefix match for nested routes (e.g. /master-list/abc-123)
    const match = Object.keys(routeTitles).find((path) =>
      location.pathname.startsWith(path)
    );
    return match ? routeTitles[match] : 'KOL Platform';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>

      {/* Right Side: Search + Avatar */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 h-9 pl-9 pr-3 rounded-lg border border-gray-300 bg-gray-50 text-sm
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400"
          />
        </div>

        {/* User Avatar */}
        <div
          className="w-9 h-9 rounded-full bg-[#1B2A4A] flex items-center justify-center text-white text-sm font-semibold cursor-pointer"
          title="User"
        >
          U
        </div>
      </div>
    </header>
  );
};

export default Header;
