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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Search className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Discovery Portal</h1>
          <p className="text-xs text-gray-500">Find new physicians through data-driven discovery</p>
        </div>
      </div>

      {/* Discovery Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {discoveryTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div key={type.id} className="bg-white rounded-lg shadow-card p-6 hover:shadow-card-hover transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{type.name}</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{type.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Coming in Phase 2</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discovery Engine Info */}
      <div className="bg-white rounded-lg shadow-card p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-brand-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Discovery Engine</h3>
        <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">
          The discovery engine will automatically surface physicians not yet on the Master List
          based on claims data, publications, congress activity, referral networks, and competitive trials.
        </p>
        <div className="mt-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-200">
            Planned for Phase 2
          </span>
        </div>
      </div>
    </div>
  );
}
