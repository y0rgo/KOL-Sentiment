import {
  Settings as SettingsIcon,
  Database,
  Users,
  Bell,
  Shield,
  Globe,
  CheckCircle,
  XCircle,
  Microscope,
  FileText,
} from 'lucide-react';

const dataSourceCards = [
  { name: 'Claims Database', status: 'connected', icon: Database, detail: 'PostgreSQL 16 | Last sync: Today' },
  { name: 'Publication Index', status: 'connected', icon: FileText, detail: 'PubMed API | 1,240 indexed' },
  { name: 'Congress Registry', status: 'connected', icon: Globe, detail: 'Manual uploads | 24 events tracked' },
  { name: 'Trial Registry', status: 'pending', icon: Microscope, detail: 'ClinicalTrials.gov | Setup required' },
];

const diseaseConfigs = [
  { name: 'Myasthenia Gravis', icd: 'G70.0', status: 'Active', products: 3, physicians: 11 },
  { name: 'CIDP', icd: 'G61.81', status: 'Active', products: 2, physicians: 0 },
  { name: 'Thyroid Eye Disease', icd: 'H06.2', status: 'Active', products: 1, physicians: 0 },
];

export default function Settings() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform configuration and administration</p>
      </div>

      {/* Data Sources */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
            <Database className="w-4 h-4 text-brand-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Data Sources</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataSourceCards.map((ds) => {
            const Icon = ds.icon;
            const connected = ds.status === 'connected';
            return (
              <div key={ds.name} className={`flex items-start gap-3 p-4 rounded-lg border ${connected ? 'border-brand-200 bg-brand-50/30' : 'border-gray-200 bg-gray-50'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${connected ? 'bg-brand-100' : 'bg-gray-200'}`}>
                  <Icon className={`w-5 h-5 ${connected ? 'text-brand-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{ds.name}</span>
                    {connected ? (
                      <CheckCircle className="w-3.5 h-3.5 text-brand-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{ds.detail}</p>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${connected ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-500'}`}>
                  {ds.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disease Configuration */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Microscope className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Disease Configuration</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 px-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Disease Area</th>
                <th className="py-2 px-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">ICD-10</th>
                <th className="py-2 px-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-2 px-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Products</th>
                <th className="py-2 px-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Physicians</th>
              </tr>
            </thead>
            <tbody>
              {diseaseConfigs.map((d) => (
                <tr key={d.name} className="table-row-hover border-b border-gray-50">
                  <td className="py-3 px-3 font-medium text-gray-900">{d.name}</td>
                  <td className="py-3 px-3 text-gray-500 font-mono text-xs">{d.icd}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600">{d.products}</td>
                  <td className="py-3 px-3 text-right text-gray-600">{d.physicians}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">User Management</h3>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Coming Soon</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { role: 'Admin', count: 2, color: 'bg-red-50 text-red-700' },
            { role: 'Medical Affairs', count: 5, color: 'bg-blue-50 text-blue-700' },
            { role: 'Field Team', count: 12, color: 'bg-green-50 text-green-700' },
          ].map((r) => (
            <div key={r.role} className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-gray-300">{r.count}</p>
              <p className="text-xs text-gray-400 mt-1">{r.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications + Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Notifications</h3>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Coming Soon</span>
          </div>
          <div className="space-y-3">
            {['New import completed', 'Review queue items', 'Tier score changes', 'Priority alerts'].map((item) => (
              <div key={item} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">{item}</span>
                <div className="w-10 h-5 rounded-full bg-gray-200 relative">
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm absolute left-0.5 top-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Security</h3>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Coming Soon</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'SSO / SAML', value: 'Not configured' },
              { label: 'Two-Factor Auth', value: 'Disabled' },
              { label: 'Session Timeout', value: '30 minutes' },
              { label: 'Audit Logging', value: 'Enabled' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="text-sm text-gray-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-gray-400">
        KOL Intelligence Platform v2.0.0 | Built for pharmaceutical medical affairs teams
      </div>
    </div>
  );
}
