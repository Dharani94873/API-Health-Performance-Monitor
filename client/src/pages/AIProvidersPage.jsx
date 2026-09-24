import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdAdd, MdRefresh, MdSearch, MdSmartToy, MdPlayArrow,
  MdEdit, MdDelete, MdPause, MdPlayCircle, MdCompare,
  MdDownload, MdVisibility, MdMemory, MdFlashOn, MdAutoAwesome,
} from 'react-icons/md';
import { BiSolidCheckCircle, BiSolidXCircle, BiSolidTimer } from 'react-icons/bi';

import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs, timeAgo, getRTColor } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PROVIDER_ICONS = {
  openai: <MdAutoAwesome className="text-emerald-400" />,
  gemini: <MdFlashOn className="text-blue-400" />,
  anthropic: <MdMemory className="text-orange-400" />,
  groq: <MdSmartToy className="text-purple-400" />,
  openrouter: <MdSmartToy className="text-pink-400" />,
  custom: <MdSmartToy className="text-slate-400" />,
};

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  anthropic: 'Anthropic',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  custom: 'Custom',
};

const STATUS_STYLES = {
  healthy: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  degraded: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  down: 'bg-red-500/15 text-red-400 border border-red-500/30',
  unknown: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

export default function AIProvidersPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [testingId, setTestingId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testModal, setTestModal] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      api.get('/cron').catch(() => {});
      const res = await api.get('/ai-usage/overview');
      setOverview(res.data.overview);
    } catch {
      toast.error('Failed to load AI provider data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async () => {
    try {
      await api.delete(`/ai-providers/${deleteModal.id}`);
      toast.success('AI Provider deleted');
      setDeleteModal({ open: false, id: null, name: '' });
      fetchData();
    } catch {
      toast.error('Failed to delete provider');
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await api.patch(`/ai-providers/${id}/toggle`);
      toast.success(enabled ? 'Provider paused' : 'Provider enabled');
      fetchData();
    } catch {
      toast.error('Failed to toggle provider');
    }
  };

  const handleTest = async (id, name) => {
    setTestingId(id);
    setTestResult(null);
    setTestModal(true);
    try {
      const res = await api.post(`/ai-providers/${id}/test`);
      setTestResult({ ...res.data.result, providerName: name });
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.message || 'Test failed', providerName: name });
    } finally {
      setTestingId(null);
    }
  };

  const providers = overview?.providers || [];
  const filtered = providers.filter(p =>
    !search ||
    p.providerName.toLowerCase().includes(search.toLowerCase()) ||
    (p.model || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-heading">
            <MdSmartToy className="text-violet-600" /> AI Provider <span className="gradient-text-violet">Intelligence</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitor AI/LLM provider APIs — health, latency, rate limits & usage
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Auto-Monitoring: Active</span>
          </div>
          <button onClick={fetchData} className="btn-secondary" title="Refresh">
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/ai-providers/compare')} className="btn-secondary">
            <MdCompare size={18} /> Compare
          </button>
          <button onClick={() => navigate('/ai-providers/add')} className="btn-primary">
            <MdAdd size={18} /> Add Provider
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={MdSmartToy} label="Total Providers" value={overview?.total ?? '—'} color="primary" loading={loading} />
        <StatCard icon={BiSolidCheckCircle} label="Healthy" value={overview?.healthy ?? '—'} color="emerald" loading={loading} />
        <StatCard icon={BiSolidXCircle} label="Down / Failed" value={(overview?.down ?? 0) + (overview?.unknown ?? 0)} color="red" loading={loading} />
        <StatCard icon={BiSolidTimer} label="Avg Latency" value={overview ? formatMs(overview.avgLatency) : '—'} color="amber" loading={loading} />
        <StatCard icon={MdSmartToy} label="Checks Today" value={overview?.checksToday ?? '—'} color="primary" loading={loading} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BiSolidCheckCircle} label="Total Tokens (24h)" value={overview?.totalTokens24h ? overview.totalTokens24h.toLocaleString() : '—'} color="emerald" loading={loading} />
        <StatCard icon={BiSolidCheckCircle} label="Health Score" value={overview?.avgHealthScore !== null && overview?.avgHealthScore !== undefined ? `${overview.avgHealthScore}/100` : '—'} color="primary" loading={loading} />
        <StatCard icon={BiSolidXCircle} label="Rate Limit Warnings" value={overview?.rateLimitWarnings ?? '—'} color={overview?.rateLimitWarnings > 0 ? 'red' : 'emerald'} loading={loading} />
        <StatCard icon={BiSolidCheckCircle} label="Degraded" value={overview?.degraded ?? '—'} color="amber" loading={loading} />
      </div>

      {/* Daily Trend Chart */}
      {overview?.dailyTrend?.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">AI Provider Availability (7 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={overview.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="uptime" name="Uptime %" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="avgLatency" name="Avg Latency (ms)" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Provider Table */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2 font-heading">
            Configured <span className="gradient-text-violet">Providers</span>{' '}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
              {filtered.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/30 w-44"
              />
            </div>
            <button
              onClick={() => {
                const url = `/api/ai-usage/export-csv?days=7`;
                window.open(`${import.meta.env.VITE_API_URL || '/api'}/ai-usage/export-csv?days=7`, '_blank');
              }}
              className="btn-secondary text-xs"
              title="Export CSV"
            >
              <MdDownload size={16} /> CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <MdSmartToy className="text-slate-700 mx-auto mb-3" size={48} />
            <p className="text-slate-500 mb-4">No AI providers configured. Add your first provider to start monitoring.</p>
            <button onClick={() => navigate('/ai-providers/add')} className="btn-primary inline-flex">
              <MdAdd /> Add AI Provider
            </button>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Provider', 'Type', 'Model', 'Status', 'Latency', 'Uptime', 'Requests Left', 'Health Score', 'Last Checked', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{PROVIDER_ICONS[p.providerType] || <MdSmartToy />}</span>
                          <span className="font-medium text-white">{p.providerName}</span>
                          {!p.monitoringEnabled && (
                            <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">Paused</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{PROVIDER_LABELS[p.providerType] || p.providerType}</td>
                      <td className="px-4 py-3 text-slate-400">{p.model || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.lastStatus] || STATUS_STYLES.unknown}`}>
                          {p.lastStatus || 'unknown'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-mono text-sm ${getRTColor(p.lastCheckLatency)}`}>
                        {p.lastCheckLatency ? formatMs(p.lastCheckLatency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {p.uptimePercentage != null ? `${p.uptimePercentage}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {p.lastRequestsRemaining != null ? p.lastRequestsRemaining.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.healthScore != null ? (
                          <span className={`font-semibold ${p.healthScore >= 80 ? 'text-emerald-400' : p.healthScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {p.healthScore}/100
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.lastCheckAt ? timeAgo(p.lastCheckAt) : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/ai-providers/${p._id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="View Details"
                          >
                            <MdVisibility size={15} />
                          </button>
                          <button
                            onClick={() => handleTest(p._id, p.providerName)}
                            disabled={testingId === p._id}
                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                            title="Test Now"
                          >
                            <MdPlayArrow size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/ai-providers/${p._id}/edit`)}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                            title="Edit"
                          >
                            <MdEdit size={15} />
                          </button>
                          <button
                            onClick={() => handleToggle(p._id, p.monitoringEnabled)}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                            title={p.monitoringEnabled ? 'Pause' : 'Enable'}
                          >
                            {p.monitoringEnabled ? <MdPause size={15} /> : <MdPlayCircle size={15} />}
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, id: p._id, name: p.providerName })}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <MdDelete size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Test Result Modal */}
      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-card p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MdPlayArrow className="text-emerald-400" />
                Test Result — {testResult?.providerName}
              </h3>
              <button onClick={() => setTestModal(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>

            {testingId ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Testing provider connection…</p>
              </div>
            ) : testResult ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${testResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {testResult.success ? <BiSolidCheckCircle /> : <BiSolidXCircle />}
                  <span className="font-semibold">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</span>
                  {testResult.statusCode && <span className="ml-auto font-mono text-sm">HTTP {testResult.statusCode}</span>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-500 text-xs mb-1">Response Time</p>
                    <p className={`font-semibold ${getRTColor(testResult.responseTime)}`}>{formatMs(testResult.responseTime)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-500 text-xs mb-1">Check Strategy</p>
                    <p className="text-slate-300 text-xs">{testResult.checkStrategy || '—'}</p>
                  </div>
                </div>

                {testResult.checkNote && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
                    ℹ️ {testResult.checkNote}
                  </div>
                )}

                {(testResult.errorMessage || testResult.error) && (
                  <div className="bg-red-500/10 rounded-lg p-3 text-sm text-red-400">
                    {testResult.errorType && <span className="font-mono text-xs block mb-1">[{testResult.errorType}]</span>}
                    {testResult.errorMessage || testResult.error}
                  </div>
                )}

                {/* Rate limits */}
                {testResult.rateLimits && Object.values(testResult.rateLimits).some(v => v !== null) && (
                  <div className="bg-white/5 rounded-lg p-3 text-sm space-y-1">
                    <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">Rate Limits</p>
                    {testResult.rateLimits.requestsLimit != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Requests Limit</span><span className="text-slate-300">{testResult.rateLimits.requestsLimit.toLocaleString()}</span></div>
                    )}
                    {testResult.rateLimits.requestsRemaining != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Requests Remaining</span><span className="text-emerald-400">{testResult.rateLimits.requestsRemaining.toLocaleString()}</span></div>
                    )}
                    {testResult.rateLimits.tokensLimit != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Tokens Limit</span><span className="text-slate-300">{testResult.rateLimits.tokensLimit.toLocaleString()}</span></div>
                    )}
                    {testResult.rateLimits.tokensRemaining != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Tokens Remaining</span><span className="text-blue-400">{testResult.rateLimits.tokensRemaining.toLocaleString()}</span></div>
                    )}
                  </div>
                )}

                {/* Token usage (e.g. from Anthropic) */}
                {testResult.tokenUsage && Object.values(testResult.tokenUsage).some(v => v !== null) && (
                  <div className="bg-white/5 rounded-lg p-3 text-sm space-y-1">
                    <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">Token Usage</p>
                    {testResult.tokenUsage.inputTokens != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Input Tokens</span><span className="text-slate-300">{testResult.tokenUsage.inputTokens}</span></div>
                    )}
                    {testResult.tokenUsage.outputTokens != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Output Tokens</span><span className="text-slate-300">{testResult.tokenUsage.outputTokens}</span></div>
                    )}
                    {testResult.tokenUsage.totalTokens != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Total Tokens</span><span className="text-violet-400 font-semibold">{testResult.tokenUsage.totalTokens}</span></div>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-600 mt-2">⚠ API keys are never shown in test results.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
        onConfirm={handleDelete}
        title="Delete AI Provider?"
        message={`Are you sure you want to delete "${deleteModal.name}"? All monitoring logs for this provider will be permanently deleted.`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
