import { useState, useEffect } from 'react';
import { MdCompare, MdAdd, MdClose, MdRefresh } from 'react-icons/md';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend, Cell } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs } from '../utils/helpers';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function CompareApisPage() {
  const [allApis, setAllApis] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingApis, setLoadingApis] = useState(true);

  useEffect(() => {
    const fetchApis = async () => {
      try {
        const { data } = await api.get('/apis?limit=100');
        setAllApis(data.apis);
      } catch { toast.error('Failed to load APIs'); }
      finally { setLoadingApis(false); }
    };
    fetchApis();
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id)
      ? prev.filter(i => i !== id)
      : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const runComparison = async () => {
    if (selectedIds.length < 2) { toast.error('Select at least 2 APIs to compare'); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/apis/compare?ids=${selectedIds.join(',')}`);
      setComparison(data.comparison);
    } catch { toast.error('Comparison failed'); }
    finally { setLoading(false); }
  };

  // Chart data
  const responseTimeData = comparison.map(a => ({ name: a.apiName.slice(0, 15), avgResponseTime: a.avgResponseTime || 0 }));
  const availabilityData = comparison.map(a => ({ name: a.apiName.slice(0, 15), availability: a.uptimePercentage || 0 }));
  const successRateData = comparison.map(a => ({ name: a.apiName.slice(0, 15), successRate: a.successRate || 0, failures: a.failures || 0 }));

  const radarData = ['avgResponseTime', 'successRate', 'uptimePercentage', 'healthScore'].map(key => ({
    metric: { avgResponseTime: 'Avg RT (ms)', successRate: 'Success %', uptimePercentage: 'Uptime %', healthScore: 'Health' }[key],
    ...comparison.reduce((obj, a, i) => {
      obj[a.apiName.slice(0, 10)] = key === 'avgResponseTime'
        ? Math.max(0, 100 - (a.avgResponseTime || 0) / 30)
        : (a[key] || 0);
      return obj;
    }, {}),
  }));

  const tooltipStyle = { contentStyle: { background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10 } };

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>API Comparison</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Compare up to 5 APIs side-by-side</p>
      </div>

      {/* Selection */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Select APIs to Compare ({selectedIds.length}/5)</h3>
          <button onClick={runComparison} disabled={loading || selectedIds.length < 2} className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdCompare size={16} /> Compare</>}
          </button>
        </div>

        {loadingApis ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 36, width: 150, borderRadius: 10 }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allApis.map((a, idx) => {
              const isSelected = selectedIds.includes(a._id);
              const selIdx = selectedIds.indexOf(a._id);
              const color = isSelected ? COLORS[selIdx] : 'var(--text-muted)';
              return (
                <button key={a._id} onClick={() => toggleSelect(a._id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 13,
                  fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                  background: isSelected ? `${COLORS[selIdx]}18` : 'var(--bg-input)',
                  color, border: `1px solid ${isSelected ? COLORS[selIdx] + '50' : 'var(--border-color)'}`,
                }}>
                  {isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[selIdx], flexShrink: 0 }} />}
                  {a.apiName}
                  {isSelected && <MdClose size={14} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      {comparison.length > 0 && (
        <>
          {/* Summary table */}
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Comparison Summary</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['API', 'Status', 'Avg RT', 'Uptime', 'Success Rate', 'Failures', 'Health Score', 'Quota Left'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((a, i) => (
                  <tr key={a._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="table-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{a.apiName}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: a.lastStatus === 'healthy' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: a.lastStatus === 'healthy' ? '#10b981' : '#ef4444',
                      }}>{a.lastStatus}</span>
                    </td>
                    <td className="table-cell" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.avgResponseTime ? formatMs(a.avgResponseTime) : '—'}</td>
                    <td className="table-cell" style={{ fontWeight: 600, color: a.uptimePercentage >= 99 ? '#10b981' : '#f59e0b' }}>{a.uptimePercentage}%</td>
                    <td className="table-cell" style={{ color: 'var(--text-primary)' }}>{a.successRate}%</td>
                    <td className="table-cell" style={{ color: a.failures > 0 ? '#ef4444' : 'var(--text-muted)' }}>{a.failures}</td>
                    <td className="table-cell" style={{ fontWeight: 600, color: '#6366f1' }}>{a.healthScore ?? '—'}</td>
                    <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{a.quotaRemaining ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <div className="glass-card p-5">
              <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>Avg Response Time (ms)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="avgResponseTime" name="Avg RT" radius={[6, 6, 0, 0]}>
                    {comparison.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-5">
              <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>Availability (%)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={availabilityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="availability" name="Availability" radius={[6, 6, 0, 0]}>
                    {comparison.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-5">
              <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>Success vs Failures</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="successRate" name="Success %" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="failures" name="Failures" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {comparison.length >= 2 && (
              <div className="glass-card p-5">
                <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 16 }}>Radar Comparison</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    {comparison.map((a, i) => (
                      <Radar key={a._id} name={a.apiName.slice(0, 10)} dataKey={a.apiName.slice(0, 10)} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                    ))}
                    <Legend />
                    <Tooltip {...tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {comparison.length === 0 && !loading && (
        <div className="glass-card p-12" style={{ textAlign: 'center' }}>
          <MdCompare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Select APIs to Compare</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Choose 2–5 APIs above and click Compare to see side-by-side analytics.</p>
        </div>
      )}
    </div>
  );
}
