import './App.css';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { buildQueue } from './lib/store.js';
import Landing from './components/Landing.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Queue from './components/Queue.jsx';
import Detail from './components/Detail.jsx';
import Live from './components/Live.jsx';
import Findings from './components/Findings.jsx';
import Reports from './components/Reports.jsx';

function LandingRoute() {
  const navigate = useNavigate();
  return <Landing onEnter={() => navigate('/dashboard')} />;
}

function ConsoleLayout() {
  const rows = buildQueue();
  const critCount = rows.filter((r) => r.fused.band === 'CRITICAL').length;
  return (
    <div className="app">
      <Sidebar critCount={critCount} />
      <main className="main"><Outlet /></main>
    </div>
  );
}

function DetailRoute() {
  const { key } = useParams();
  const navigate = useNavigate();
  const row = buildQueue().find((r) => r.key === key);
  if (!row) return <Navigate to="/queue" replace />;
  return <Detail row={row} onBack={() => navigate('/queue')} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<LandingRoute />} />
        <Route element={<ConsoleLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/queue/:key" element={<DetailRoute />} />
          <Route path="/live" element={<Live />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
