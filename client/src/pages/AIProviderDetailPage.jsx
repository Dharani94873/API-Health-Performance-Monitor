import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  MdSmartToy, MdArrowBack, MdRefresh, MdPlayArrow, MdEdit,
  MdCheckCircle, MdCancel, MdTimer,
} from 'react-icons/md';
import { BiSolidCheckCircle, BiSolidXCircle } from 'react-icons/bi';
import HealthScoreGauge from '../components/HealthScoreGauge';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs, timeAgo, getRTColor, formatDate } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const STATUS_STYLES = {
  healthy: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  degraded: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  down: 'bg-red-500/15 text-red-400 border border-red-500/30',
  unknown: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
};

const PROVIDER_LABELS = {
  openai: 'OpenAI', gemini: 'Google Gemini', anthropic: 'Anthropic',
  groq: 'Groq', openrouter: 'OpenRouter', custom: 'Custom',
};

const MetricCard = ({ label, value, sub, valueClass = 'text-white' }) => (
  <div className="glass-card p-4">
    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

export default function AIProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [providerRes, analyticsRes] = await Promise.all([
        api.get(`/ai-providers/${id}`),
        api.get(`/ai-providers/${id}/analytics`),
      ]);
      setData({
        provider: providerRes.data.aiProvider,
        analytics: analyticsRes.data,
      });
    } catch {
      toast.error('Failed to load provider details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post(`/ai-providers/${id}/test`);
      setTestResult(res.data.result);
      toast.success('Test complete');
      // Refresh page data and logs
      setTimeout(fetchData, 600);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-slate-500">Provider not found.</div>;

  const { provider, analytics } = data;
  const stats = analytics?.stats || {};
  const trend = analytics?.trend || [];
  const rateLimitHistory = analytics?.rateLimitHistory || [];
  const logs = analytics?.logs || [];

  const capNote = provider.capabilities?.checkNote;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/ai-providers')} className="btn-secondary">
            <MdArrowBack size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{provider.providerName}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[provider.lastStatus] || STATUS_STYLES.unknown}`}>
                {provider.lastStatus || 'unknown'}
              </span>
              {!provider.monitoringEnabled && (
                <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Paused</span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              {PROVIDER_LABELS[provider.providerType] || provider.providerType}
              {provider.model && <> · <span className="font-mono">{provider.model}</span></>}
              {' · '}{provider.lastCheckAt ? `Last checked ${timeAgo(provider.lastCheckAt)}` : 'Never checked'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="btn-secondary" title="Refresh">
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleTest} disabled={testing} className="btn-secondary">
            <MdPlayArrow size={18} />
            {testing ? 'Testing…' : 'Test Now'}
          </button>
          <Link to={`/ai-providers/${id}/edit`} className="btn-primary">
            <MdEdit size={18} /> Edit
          </Link>
        </div>
      </div>

      {capNote && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-sm text-violet-300 flex items-start gap-2">
          <MdSmartToy className="flex-shrink-0 mt-0.5" size={16} />
          {capNote}
        </div>
      )}

      {/* Test Result Banner */}
      {testResult && (
        <div className={`glass-card p-4 border ${testResult.success ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {testResult.success
                ? <BiSolidCheckCircle className="text-emerald-400 text-xl" />
                : <BiSolidXCircle className="text-red-400 text-xl" />}
              <div>
                <p className={`font-semibold text-sm ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {testResult.success ? 'Connection Successful' : `Connection Failed — ${testResult.errorType || ''}`}
                </p>
                {testResult.errorMessage && <p className="text-xs text-slate-500 mt-0.5">{testResult.errorMessage}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {testResult.statusCode && <span className="text-slate-400">HTTP <span className="text-white font-mono">{testResult.statusCode}</span></span>}
              <span className={getRTColor(testResult.responseTime)}>{formatMs(testResult.responseTime)}</span>
              {testResult.rateLimits?.requestsRemaining != null && (
                <span className="text-blue-400">{testResult.rateLimits.requestsRemaining.toLocaleString()} req left</span>
              )}
            </div>
          </div>
          {testResult.tokenUsage && testResult.tokenUsage.totalTokens != null && (
            <div className="mt-2 flex gap-4 text-xs text-slate-400">
              <span>Input: {testResult.tokenUsage.inputTokens ?? '—'} tokens</span>
              <span>Output: {testResult.tokenUsage.outputTokens ?? '—'} tokens</span>
              <span className="text-violet-400 font-semibold">Total: {testResult.tokenUsage.totalTokens} tokens</span>
            </div>
          )}
        </div>
      )}

      {/* Health Score + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 flex flex-col items-center justify-center">
          {provider.healthScore != null ? (
            <HealthScoreGauge score={provider.healthScore} />
          ) : (
            <div className="text-slate-500 text-sm text-center py-4">No health score yet</div>
          )}
          <p className="text-xs text-slate-500 mt-2">AI API Health Score</p>
        </div>
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <MetricCard label="Availability" value={`${provider.uptimePercentage ?? 0}%`}
            valueClass={provider.uptimePercentage >= 95 ? 'text-emerald-400' : 'text-red-400'} />
          <MetricCard label="Avg Latency" value={formatMs(stats.avgLatency)}
            valueClass={getRTColor(stats.avgLatency)} />
          <MetricCard label="P95 Latency" value={formatMs(stats.p95Latency)} />
          <MetricCard label="Success Rate"
            value={stats.totalChecks ? `${Math.round((stats.successCount / stats.totalChecks) * 100)}%` : '—'}
            valueClass={stats.totalChecks && stats.successCount / stats.totalChecks >= 0.95 ? 'text-emerald-400' : 'text-red-400'} />
          <MetricCard label="Total Checks" value={stats.totalChecks ?? 0} />
          <MetricCard label="Failures" value={stats.failureCount ?? 0}
            valueClass={stats.failureCount > 0 ? 'text-red-400' : 'text-emerald-400'} />
        </div>
      </div>

      {/* Token Usage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Input Tokens (total)" value={stats.totalInputTokens?.toLocaleString() ?? '—'} valueClass="text-blue-400" />
        <MetricCard label="Output Tokens (total)" value={stats.totalOutputTokens?.toLocaleString() ?? '—'} valueClass="text-violet-400" />
        <MetricCard label="Total Tokens" value={stats.totalTokens?.toLocaleString() ?? '—'} valueClass="text-white" />
        <MetricCard label="Health Grade" value={provider.healthGrade ?? '—'}
          valueClass={provider.healthGrade === 'Excellent' ? 'text-emerald-400' : provider.healthGrade === 'Poor' ? 'text-red-400' : 'text-amber-400'} />
      </div>

      {/* Rate Limit Info */}
      {(provider.lastRequestsLimit || provider.lastTokensLimit) && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Current Rate Limits</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {provider.lastRequestsLimit && (
              <MetricCard label="Requests / min limit" value={provider.lastRequestsLimit.toLocaleString()} />
            )}
            {provider.lastRequestsRemaining != null && (
              <MetricCard label="Requests Remaining"
                value={provider.lastRequestsRemaining.toLocaleString()}
                valueClass={provider.lastRequestsLimit && (provider.lastRequestsRemaining / provider.lastRequestsLimit) < 0.1 ? 'text-red-400' : 'text-emerald-400'} />
            )}
            {provider.lastTokensLimit && (
              <MetricCard label="Tokens / min limit" value={provider.lastTokensLimit.toLocaleString()} />
            )}
            {provider.lastTokensRemaining != null && (
              <MetricCard label="Tokens Remaining"
                value={provider.lastTokensRemaining.toLocaleString()}
                valueClass={provider.lastTokensLimit && (provider.lastTokensRemaining / provider.lastTokensLimit) < 0.1 ? 'text-red-400' : 'text-emerald-400'} />
            )}
          </div>
        </div>
      )}

      {/* Charts */}
      {trend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4">Latency Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="index" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }} />
                <Line type="monotone" dataKey="responseTime" name="Latency (ms)" stroke="#8b5cf6"
                  strokeWidth={2} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-4">Check Results (Success / Fail)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="index" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="statusCode" name="Status Code" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rate Limit History Chart */}
      {rateLimitHistory.length > 1 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Rate Limit — Requests Remaining (History)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rateLimitHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="checkedAt" tickFormatter={v => timeAgo(v)}
                tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="requestsRemaining" name="Requests Remaining" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tokensRemaining" name="Tokens Remaining" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Logs */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Recent Monitoring Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Checked At', 'Status', 'Latency', 'Tokens', 'Req Left', 'Error'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 20).map((log, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/2">
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{formatDate(log.checkedAt)}</td>
                  <td className="px-4 py-2.5">
                    {log.success
                      ? <span className="flex items-center gap-1 text-emerald-400"><MdCheckCircle size={14} /> OK {log.statusCode}</span>
                      : <span className="flex items-center gap-1 text-red-400"><MdCancel size={14} /> {log.statusCode || 'Error'}</span>}
                  </td>
                  <td className={`px-4 py-2.5 font-mono text-sm ${getRTColor(log.responseTime)}`}>{formatMs(log.responseTime)}</td>
                  <td className="px-4 py-2.5 text-slate-400">{log.totalTokens != null ? log.totalTokens.toLocaleString() : '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400">{log.requestsRemaining != null ? log.requestsRemaining.toLocaleString() : '—'}</td>
                  <td className="px-4 py-2.5 text-red-400 text-xs max-w-xs truncate">{log.errorMessage || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No logs yet. The scheduler will populate logs on the next check interval.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
