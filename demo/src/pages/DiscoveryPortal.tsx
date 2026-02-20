import { Search, Database, BookOpen, Users, FlaskConical, Globe } from 'lucide-react';

const discoveryTypes = [
  { id: 'claims', name: 'Claims Analysis', icon: Database, description: 'Find high-volume prescribers not on the Master List based on claims data.' },
  { id: 'publications', name: 'Publication Scan', icon: BookOpen, description: 'Discover authors publishing on target diseases.' },
  { id: 'congress', name: 'Congress Monitor', icon: Globe, description: 'Find congress presenters not yet on the Master List.' },
  { id: 'referral', name: 'Referral Network', icon: Users, description: 'Identify referral network hubs treating target diseases.' },
  { id: 'trials', name: 'Competitive Trials', icon: FlaskConical, description: 'Find investigators on competitor clinical trials.' },
];

export default function DiscoveryPortal() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Discovery Portal</h1>
        <p className="text-gray-500 mt-1">Find new physicians through data-driven discovery</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discoveryTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div key={type.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-teal" />
                </div>
                <h3 className="font-semibold text-navy">{type.name}</h3>
              </div>
              <p className="text-sm text-gray-500">{type.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Coming in Phase 2</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Discovery Engine</h3>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">
          The discovery engine will automatically surface physicians not yet on the Master List
          based on claims data, publications, congress activity, referral networks, and competitive trials.
        </p>
      </div>
    </div>
  );
}
