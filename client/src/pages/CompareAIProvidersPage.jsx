import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCompare, MdArrowBack, MdSmartToy, MdAdd, MdClose } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs, getRTColor } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const PROVIDER_LABELS = {
  openai: 'OpenAI', gemini: 'Google Gemini', anthropic: 'Anthropic',
  groq: 'Groq', openrouter: 'OpenRouter', custom: 'Custom',
};

export default function CompareAIProvidersPage() {
  const navigate = useNavigate();
  const [allProviders, setAllProviders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProviders, setFetchingProviders] = useState(true);

  useEffect(() => {
    api.get('/ai-providers?limit=100')
      .then(res => setAllProviders(res.data.aiProviders || []))
      .catch(() => toast.error('Failed to load providers'))
      .finally(() => setFetchingProviders(false));
  }, []);

  const handleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) { toast.error('Maximum 5 providers'); return prev; }
      return [...prev, id];
    });
    setComparison(null);
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return toast.error('Select at least 2 providers to compare');
    setLoading(true);
    try {
      const res = await api.get(`/ai-usage/compare?ids=${selectedIds.join(',')}`);
      setComparison(res.data.comparison);
    } catch {
      toast.error('Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  // Build trend chart data aligned by index
  const buildTrendData = () => {
    if (!comparison) return [];
    const maxLen = Math.max(...comparison.map(p => p.recentLogs?.length || 0));
    return Array.from({ length: Math.min(maxLen, 50) }, (_, i) => {
      const entry = { index: i + 1 };
      for (const p of comparison) {
        const log = p.recentLogs?.[i];
        if (log) entry[p.providerName] = log.responseTime;
      }
      return entry;
    });
  };

  // Build radar chart data
  const buildRadarData = () => {
    if (!comparison) return [];
    return [
      { metric: 'Availability', ...Object.fromEntries(comparison.map(p => [p.providerName, p.availabilityPct])) },
      { metric: 'Health Score', ...Object.fromEntries(comparison.map(p => [p.providerName, p.healthScore ?? 0])) },
      { metric: 'Success Rate', ...Object.fromEntries(comparison.map(p => [p.providerName, 100 - p.errorRate])) },
    ];
  };

  const trendData = buildTrendData();
  const radarData = buildRadarData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/ai-providers')} className="btn-secondary">
          <MdArrowBack size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdCompare className="text-violet-400" /> Compare AI Providers
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Select up to 5 providers to compare metrics side-by-side</p>
        </div>
      </div>

      {/* Provider Selector */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <MdAdd size={18} className="text-violet-400" /> Select Providers
          <span className="text-slate-500 font-normal text-sm">({selectedIds.length}/5 selected)</span>
        </h3>

        {fetchingProviders ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
          </div>
        ) : allProviders.length === 0 ? (
          <p className="text-slate-500 text-sm">No AI providers configured. <button onClick={() => navigate('/ai-providers/add')} className="text-violet-400 underline">Add one</button>.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allProviders.map((p, i) => {
              const isSelected = selectedIds.includes(p._id);
              const colorIdx = selectedIds.indexOf(p._id);
              return (
                <button
                  key={p._id}
                  onClick={() => handleSelect(p._id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: COLORS[colorIdx] }}
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{p.providerName}</p>
                      <p className="text-xs text-slate-500">{PROVIDER_LABELS[p.providerType]} · {p.model || 'any model'}</p>
                    </div>
                  </div>
                  {isSelected && <MdClose size={16} className="text-slate-400" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleCompare}
            disabled={loading || selectedIds.length < 2}
            className="btn-primary"
          >
            <MdCompare size={18} />
            {loading ? 'Comparing…' : 'Compare'}
          </button>
          {selectedIds.length > 0 && (
            <button onClick={() => { setSelectedIds([]); setComparison(null); }} className="btn-secondary">
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Metrics Table */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-white">Comparison Metrics</h3>
              <p className="text-xs text-slate-500 mt-0.5">Values are from the last 100 monitoring checks. No provider is labeled "best".</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Metric</th>
                    {comparison.map((p, i) => (
                      <th key={p._id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: COLORS[i] }}>
                        {p.providerName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Provider Type', fn: p => PROVIDER_LABELS[p.providerType] || p.providerType, isText: true },
                    { label: 'Model', fn: p => p.model || '—', isText: true },
                    { label: 'Status', fn: p => p.lastStatus || 'unknown', isText: true },
                    { label: 'Health Score', fn: p => p.healthScore != null ? `${p.healthScore}/100` : '—' },
                    { label: 'Availability', fn: p => p.availabilityPct != null ? `${p.availabilityPct}%` : '—' },
                    { label: 'Avg Latency', fn: p => p.avgLatency != null ? formatMs(p.avgLatency) : '—' },
                    { label: 'Error Rate', fn: p => `${p.errorRate ?? 0}%` },
                    { label: 'Total Checks', fn: p => (p.totalChecks || 0).toLocaleString() },
                    { label: 'Successes', fn: p => (p.successCount || 0).toLocaleString() },
                    { label: 'Failures', fn: p => (p.failureCount || 0).toLocaleString() },
                    { label: 'Total Tokens', fn: p => p.totalTokens ? p.totalTokens.toLocaleString() : '—' },
                    { label: 'Uptime %', fn: p => p.uptimePercentage != null ? `${p.uptimePercentage}%` : '—' },
                  ].map(({ label, fn }) => (
                    <tr key={label} className="border-t border-white/5 hover:bg-white/2">
                      <td className="px-4 py-2.5 text-slate-400 text-xs font-medium">{label}</td>
                      {comparison.map(p => (
                        <td key={p._id} className="px-4 py-2.5 text-slate-300 text-sm">{fn(p)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Latency Trend Chart */}
          {trendData.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-4">Latency Comparison (Recent Checks)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="index" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                  {comparison.map((p, i) => (
                    <Line key={p._id} type="monotone" dataKey={p.providerName}
                      stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Radar Chart */}
          {radarData.length > 0 && comparison.length >= 2 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold text-white mb-4">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                  {comparison.map((p, i) => (
                    <Radar key={p._id} name={p.providerName} dataKey={p.providerName}
                      stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
