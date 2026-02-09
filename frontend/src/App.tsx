import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MasterList from './pages/MasterList';
import ImportData from './pages/ImportData';
import ReviewQueue from './pages/ReviewQueue';
import Dashboard from './pages/Dashboard';
import PersonaView from './pages/PersonaView';
import DiscoveryPortal from './pages/DiscoveryPortal';
import Settings from './pages/Settings';
import TierConfig from './pages/TierConfig';

export default function App() {
  return (
    <div className="flex h-screen bg-page">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/master-list" replace />} />
            <Route path="/master-list" element={<MasterList />} />
            <Route path="/import" element={<ImportData />} />
            <Route path="/discovery" element={<DiscoveryPortal />} />
            <Route path="/review-queue" element={<ReviewQueue />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/persona/:id" element={<PersonaView />} />
            <Route path="/tier-config" element={<TierConfig />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
