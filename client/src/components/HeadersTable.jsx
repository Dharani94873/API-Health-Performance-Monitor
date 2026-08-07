/**
 * HeadersTable — displays response headers in a clean, categorized table
 */
import { useState } from 'react';
import { MdContentCopy, MdCheck } from 'react-icons/md';

const SECURITY_HEADERS = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
const RATE_HEADERS = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'retry-after', 'ratelimit-limit', 'ratelimit-remaining'];
const CACHE_HEADERS = ['cache-control', 'etag', 'last-modified', 'expires', 'pragma', 'age'];

const getCategory = (key) => {
  const k = key.toLowerCase();
  if (SECURITY_HEADERS.includes(k)) return 'Security';
  if (RATE_HEADERS.includes(k)) return 'Rate Limit';
  if (CACHE_HEADERS.includes(k)) return 'Cache';
  if (k.startsWith('x-')) return 'Custom';
  return 'General';
};

const CATEGORY_COLORS = {
  Security:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  'Rate Limit':{ color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Cache:      { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  Custom:     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  General:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px', borderRadius: 4 }}>
      {copied ? <MdCheck size={14} color="#10b981" /> : <MdContentCopy size={14} />}
    </button>
  );
}

export default function HeadersTable({ headers = {} }) {
  const [filter, setFilter] = useState('All');

  const entries = Object.entries(headers).map(([k, v]) => ({
    key: k, value: String(v), category: getCategory(k),
  }));

  const categories = ['All', ...new Set(entries.map(e => e.category))];
  const filtered = filter === 'All' ? entries : entries.filter(e => e.category === filter);

  if (!entries.length) {
    return (
      <div className="glass-card p-6" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No response headers captured yet. Headers will appear after the next monitoring check.</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        {categories.map(cat => {
          const info = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
          const active = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: active ? info.bg : 'transparent',
                color: active ? info.color : 'var(--text-muted)',
                border: `1px solid ${active ? info.color + '50' : 'var(--border-color)'}`,
                transition: 'all 0.2s',
              }}
            >
              {cat} ({cat === 'All' ? entries.length : entries.filter(e => e.category === cat).length})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th className="table-header" style={{ width: '35%' }}>Header</th>
              <th className="table-header">Value</th>
              <th className="table-header" style={{ width: 80 }}>Type</th>
              <th className="table-header" style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ key, value, category }) => {
              const info = CATEGORY_COLORS[category] || CATEGORY_COLORS.General;
              return (
                <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="table-cell">
                    <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{key}</code>
                  </td>
                  <td className="table-cell">
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{value}</span>
                  </td>
                  <td className="table-cell">
                    <span style={{ fontSize: 10, fontWeight: 600, color: info.color, background: info.bg, padding: '2px 6px', borderRadius: 10 }}>
                      {category}
                    </span>
                  </td>
                  <td className="table-cell">
                    <CopyBtn value={value} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
