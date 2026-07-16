import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import GlintLogo from './GlintLogo.jsx';
import UserChip from './UserChip.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/queue', label: 'Threat Queue', icon: '◧' },
  { to: '/live', label: 'Live Scoring', icon: '◉' },
  { to: '/findings', label: 'Findings', icon: '◈' },
  { to: '/reports', label: 'Reports', icon: '▤' },
];

export default function Sidebar({ critCount }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`side ${collapsed ? 'collapsed' : ''}`}>
      <div className="side-top">
        <Link to="/home" className="brand" style={{ background: 'transparent' }}>
          <GlintLogo size={19} showMark word={!collapsed} />
        </Link>
        <button className="side-toggle" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? n.label : undefined}>
            <span style={{ fontSize: 15, width: 18, display: 'inline-block', flexShrink: 0 }}>{n.icon}</span>
            {!collapsed && <span>{n.label}</span>}
            {!collapsed && n.to === '/queue' && critCount > 0 && <span className="badge">{critCount}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="side-bottom">
        <UserChip collapsed={collapsed} />
      </div>
    </aside>
  );
}
