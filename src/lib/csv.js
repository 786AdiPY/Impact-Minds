// Generic CSV exporter. A flat array of objects (Queue, Findings) becomes one
// table. Nested report shapes (Dashboard, Reports) get walked recursively:
// every array-of-objects found at any depth becomes its own named section;
// remaining scalars at each level collapse into a single key/value row.

const esc = (v) => {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function tableToCSV(rows) {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(','));
  return lines.join('\n');
}

// Walk `obj`, emitting one section per array-of-objects found (named by path),
// plus a trailing section of whatever scalars/nested-objects are left at
// each level (nested objects are JSON-stringified into a single cell).
function walk(obj, path, sections) {
  const leftover = {};
  for (const [key, val] of Object.entries(obj)) {
    const p = path ? `${path}.${key}` : key;
    if (Array.isArray(val) && val.length && typeof val[0] === 'object') {
      sections.push({ name: p, rows: val });
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      walk(val, p, sections);
    } else {
      leftover[key] = val;
    }
  }
  if (Object.keys(leftover).length) sections.push({ name: path || 'summary', rows: [leftover] });
}

export function toCSV(data) {
  if (Array.isArray(data)) return tableToCSV(data);

  const sections = [];
  walk(data, '', sections);
  return sections.map((s) => `# ${s.name}\n${tableToCSV(s.rows)}`).join('\n\n');
}

export function download(filename, data) {
  const csv = toCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
