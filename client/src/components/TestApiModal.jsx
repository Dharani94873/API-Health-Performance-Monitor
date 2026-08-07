/**
 * TestApiModal — sends immediate test request and shows full response details
 */
import { useState } from 'react';
import { MdClose, MdPlayArrow, MdCheck, MdError, MdTimer } from 'react-icons/md';
import api from '../services/api';

export default function TestApiModal({ apiId, apiName, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post(`/apis/${apiId}/test`);
      setResult(res.data.result);
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.message || err.message });
    } finally {
      setLoading(false);
    }
  };

  const TABS = ['overview', 'headers', 'body', 'rate-limit'];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>Test API</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{apiName}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8 }}>
            <MdClose size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', flex: 1, padding: 20 }}>
          {/* Run button */}
          <button
            onClick={runTest}
            disabled={loading}
            className="btn-primary w-full"
            style={{ justifyContent: 'center', marginBottom: 20 }}
          >
            <MdPlayArrow size={20} />
            {loading ? 'Testing...' : 'Run Test Now'}
          </button>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sending request...</p>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <>
              {/* Status bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, marginBottom: 16, background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                {result.success
                  ? <MdCheck size={20} color="#10b981" />
                  : <MdError size={20} color="#ef4444" />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: result.success ? '#10b981' : '#ef4444', fontSize: 14 }}>
                    {result.success ? 'Success' : 'Failed'} — {result.statusCode ? `HTTP ${result.statusCode}` : result.error}
                  </p>
                  {result.responseTime && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <MdTimer size={12} style={{ verticalAlign: 'middle' }} /> {result.responseTime}ms
                    </p>
                  )}
                </div>
                {result.responseSize && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {(result.responseSize / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#6366f1' : 'transparent'}`,
                      color: activeTab === tab ? '#6366f1' : 'var(--text-muted)',
                      transition: 'all 0.2s', textTransform: 'capitalize',
                    }}
                  >
                    {tab.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Status Code', result.statusCode || '—'],
                    ['Response Time', result.responseTime ? `${result.responseTime}ms` : '—'],
                    ['Response Size', result.responseSize ? `${(result.responseSize / 1024).toFixed(2)} KB` : '—'],
                    ['Content Type', result.contentType || '—'],
                    ['Rate Limit', result.rateLimit?.limit ?? '—'],
                    ['Remaining', result.rateLimit?.remaining ?? '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="glass-card p-3">
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'headers' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th className="table-header">Header</th>
                        <th className="table-header">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.headers || {}).map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td className="table-cell"><code style={{ fontFamily: 'monospace', fontSize: 12 }}>{k}</code></td>
                          <td className="table-cell" style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{String(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'body' && (
                <pre style={{
                  background: 'var(--bg-page)', border: '1px solid var(--border-color)',
                  borderRadius: 8, padding: 12, overflow: 'auto', maxHeight: 300,
                  fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {result.bodyPreview || '(empty)'}
                </pre>
              )}

              {activeTab === 'rate-limit' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {result.rateLimit ? (
                    [
                      ['Limit', result.rateLimit.limit ?? '—'],
                      ['Remaining', result.rateLimit.remaining ?? '—'],
                      ['Used', result.rateLimit.used ?? '—'],
                      ['Reset', result.rateLimit.reset ? new Date(result.rateLimit.reset).toLocaleString() : '—'],
                      ['Retry After', result.rateLimit.retryAfter ? `${result.rateLimit.retryAfter}s` : '—'],
                    ].map(([l, v]) => (
                      <div key={l} className="glass-card p-3">
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: 13 }}>
                      No rate limit headers found in this response.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
