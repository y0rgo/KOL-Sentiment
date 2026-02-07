import { Route, Routes } from 'react-router-dom'
import PageLayout from './components/layout/PageLayout'
import Dashboard from './pages/Dashboard'
import PhysicianList from './pages/PhysicianList'
import PersonaView from './pages/PersonaView'
import SentimentDashboard from './pages/SentimentDashboard'
import NetworkExplorer from './pages/NetworkExplorer'
import EngagementPlanner from './pages/EngagementPlanner'
import AdBoardSimulator from './pages/AdBoardSimulator'
import DataIngestion from './pages/DataIngestion'
import Settings from './pages/Settings'

export default function App() {
  return (
    <PageLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/physicians" element={<PhysicianList />} />
        <Route path="/physicians/:id" element={<PersonaView />} />
        <Route path="/sentiment" element={<SentimentDashboard />} />
        <Route path="/network" element={<NetworkExplorer />} />
        <Route path="/engagements" element={<EngagementPlanner />} />
        <Route path="/simulator" element={<AdBoardSimulator />} />
        <Route path="/data" element={<DataIngestion />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </PageLayout>
  )
}
