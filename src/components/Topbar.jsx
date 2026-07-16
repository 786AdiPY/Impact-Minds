import { useState } from 'react';
import { download } from '../lib/csv.js';

const RANGES = ['Live', 'Last 24h', 'Last 7d'];

export default function Topbar({ exportName, exportData, exportLabel = 'Export Report' }) {
  const [range, setRange] = useState(0);
  return (
    <div className="topbar">
      <button className="range-pill" onClick={() => setRange((r) => (r + 1) % RANGES.length)}>
        <span className="cal-ico">◷</span> {RANGES[range]}
      </button>
      {exportData && (
        <button className="btn btn-g export-btn" onClick={() => download(exportName || 'glint-export.csv', typeof exportData === 'function' ? exportData() : exportData)}>
          ↓ {exportLabel}
        </button>
      )}
    </div>
  );
}
