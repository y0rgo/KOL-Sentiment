import { Settings as SettingsIcon, Database, Users, Bell, Shield } from 'lucide-react';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="text-gray-500 mt-1">Platform configuration and administration</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-teal" />
            <h3 className="font-semibold text-navy">Database</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Engine:</span>
              <span className="ml-2 font-medium">PostgreSQL 16</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className="ml-2 text-green-600 font-medium">Connected</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-teal" />
            <h3 className="font-semibold text-navy">User Management</h3>
          </div>
          <p className="text-sm text-gray-400">User management will be available in a future release.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-teal" />
            <h3 className="font-semibold text-navy">Notifications</h3>
          </div>
          <p className="text-sm text-gray-400">Notification settings will be available in a future release.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-teal" />
            <h3 className="font-semibold text-navy">Security</h3>
          </div>
          <p className="text-sm text-gray-400">Security settings will be available in a future release.</p>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-400">
        KOL Intelligence Platform v2.0.0
      </div>
    </div>
  );
}
