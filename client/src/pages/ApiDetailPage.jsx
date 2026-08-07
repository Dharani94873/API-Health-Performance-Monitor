import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack, MdEdit, MdDelete, MdOpenInNew, MdDownload, MdRefresh, MdPlayArrow } from 'react-icons/md';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import LogTable from '../components/LogTable';
import Modal from '../components/Modal';
import HealthScoreGauge from '../components/HealthScoreGauge';
import SslBadge from '../components/SslBadge';
import RateLimitCard from '../components/RateLimitCard';
import HeadersTable from '../components/HeadersTable';
import TestApiModal from '../components/TestApiModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs, getStatusClass, getMethodColor, timeAgo } from '../utils/helpers';

const TABS = ['overview', 'headers', 'rate-limit', 'ssl', 'health-score', 'response-size', 'logs'];
const TAB_LABELS = { 'overview': 'Overview', 'headers': 'Headers', 'rate-limit': 'Rate Limit', 'ssl': 'SSL', 'health-score': 'Health Score', 'response-size': 'Response Size', 'logs': 'Logs' };

export default function ApiDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [testModal, setTestModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [logTotal, setLogTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [detailRes, logsRes] = await Promise.all([
        api.get(`/analytics/api/${id}`),
        api.get(`/logs/${id}?page=1&limit=50`),
      ]);
      setData(detailRes.data);
      setLogs(logsRes.data.logs);
      setLogTotal(logsRes.data.total);
    } catch {
      toast.error('Failed to load API details');
    } finally {
      setLoading(false);
      setLogsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    try {
      await api.delete(`/apis/${id}`);
      toast.success('API deleted');
      navigate('/dashboard');
    } catch { toast.error('Failed to delete'); }
  };

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const url = `/api/reports/csv?apiId=${id}&days=30`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${data?.api?.apiName || 'api'}-report.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Report exported!');
    } catch { toast.error('Export failed'); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { api: apiData, stats, trend, sizeTrend, quotaHistory, latestHeaders } = data;
  const uptimeColor = stats.uptime >= 99 ? '#10b981' : stats.uptime >= 90 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary p-2 mt-1"><MdArrowBack size={18} /></button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${getMethodColor(apiData.method)}`}>{apiData.method}</span>
              <span className={getStatusClass(apiData.lastStatus)}>{apiData.lastStatus || 'unknown'}</span>
              {!apiData.active && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(100,116,139,0.1)', padding: '1px 8px', borderRadius: 20, border: '1px solid rgba(100,116,139,0.2)' }}>Paused</span>}
              {apiData.sslValid !== undefined && <SslBadge sslValid={apiData.sslValid} sslDaysRemaining={apiData.sslDaysRemaining} sslExpiry={apiData.sslExpiry} compact />}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{apiData.apiName}</h1>
            <a href={apiData.apiUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              {apiData.apiUrl} <MdOpenInNew size={13} />
            </a>
            {apiData.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{apiData.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchData} className="btn-secondary p-2"><MdRefresh size={18} /></button>
          <button onClick={() => setTestModal(true)} className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}><MdPlayArrow size={18} /> Test API</button>
          <button onClick={handleExportCSV} className="btn-secondary"><MdDownload size={18} /> Export CSV</button>
          <button onClick={() => navigate(`/apis/${id}/edit`)} className="btn-secondary"><MdEdit size={18} /> Edit</button>
          <button onClick={() => setDeleteModal(true)} className="btn-danger"><MdDelete size={18} /></button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {[
          { label: 'Uptime', value: `${stats.uptime}%`, color: uptimeColor },
          { label: 'Avg Latency', value: formatMs(stats.avgLatency), color: '#6366f1' },
          { label: 'Min Latency', value: formatMs(stats.minLatency), color: '#10b981' },
          { label: 'Max Latency', value: formatMs(stats.maxLatency), color: '#ef4444' },
          { label: 'Total Checks', value: stats.totalChecks, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 2 }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: 'none', border: 'none', whiteSpace: 'nowrap',
            borderBottom: `2px solid ${activeTab === tab ? '#6366f1' : 'transparent'}`,
            color: activeTab === tab ? '#6366f1' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Config */}
          <div className="glass-card p-5">
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, fontSize: 15 }}>API Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {[
                { label: 'Expected Status', value: apiData.expectedStatus },
                { label: 'Timeout', value: formatMs(apiData.timeout) },
                { label: 'Check Interval', value: `${apiData.interval < 60 ? `${apiData.interval} min` : `${apiData.interval / 60}h`}` },
                { label: 'Last Checked', value: timeAgo(apiData.lastChecked) },
                { label: 'Auth Type', value: apiData.authentication?.type || 'none' },
                { label: 'Health Grade', value: apiData.healthGrade || 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{value || 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Response Time Chart */}
          {trend.length > 0 && (
            <div className="glass-card p-5">
              <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, fontSize: 15 }}>Response Time History</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="index" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" />
                  <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10 }} />
                  <Line type="monotone" dataKey="responseTime" name="Response Time (ms)" stroke="#6366f1" strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return payload.success
                        ? <circle key={cx} cx={cx} cy={cy} r={3} fill="#10b981" stroke="none" />
                        : <circle key={cx} cx={cx} cy={cy} r={4} fill="#ef4444" stroke="none" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {activeTab === 'headers' && (
        <div className="space-y-3">
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Response headers from the most recent check.</p>
          <HeadersTable headers={latestHeaders || {}} />
        </div>
      )}

      {activeTab === 'rate-limit' && (
        <div className="space-y-3">
          <RateLimitCard
            quotaLimit={apiData.quotaLimit}
            quotaRemaining={apiData.quotaRemaining}
            quotaUsed={apiData.quotaUsed}
            quotaReset={apiData.quotaReset}
            quotaHistory={data.quotaHistory || []}
          />
        </div>
      )}

      {activeTab === 'ssl' && (
        <div className="space-y-3">
          <SslBadge
            sslValid={apiData.sslValid}
            sslExpiry={apiData.sslExpiry}
            sslDaysRemaining={apiData.sslDaysRemaining}
            sslIssuer={apiData.sslIssuer}
          />
        </div>
      )}

      {activeTab === 'health-score' && (
        <div className="glass-card p-6 space-y-6">
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>AI Health Score</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
            <HealthScoreGauge score={apiData.healthScore} grade={apiData.healthGrade} size={160} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>Score based on:</p>
              {[
                { label: 'Availability (40pts)', desc: 'Whether the API responded successfully' },
                { label: 'Response Time (30pts)', desc: 'How fast the API responds' },
                { label: 'Uptime (20pts)', desc: 'Long-term reliability percentage' },
                { label: 'Status Code (10pts)', desc: 'HTTP status code quality' },
              ].map(({ label, desc }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
          {trend.filter(t => t.healthScore).length > 1 && (
            <>
              <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>Health Score History</h4>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trend.filter(t => t.healthScore)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="index" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10 }} />
                  <Area type="monotone" dataKey="healthScore" name="Health Score" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      {activeTab === 'response-size' && (
        <div className="glass-card p-5 space-y-4">
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>Response Size Trends</h3>
          {sizeTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={sizeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="index" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1024).toFixed(0)}KB`} />
                <Tooltip
                  contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10 }}
                  formatter={(v) => [`${(v / 1024).toFixed(2)} KB`, 'Size']}
                />
                <Area type="monotone" dataKey="size" name="Size" stroke="#10b981" fill="rgba(16,185,129,0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No response size data yet. Data will appear after the next monitoring check.</p>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>
              Monitoring History <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13 }}>({logTotal} total)</span>
            </h3>
          </div>
          <LogTable logs={logs} loading={logsLoading} />
        </div>
      )}

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete API?"
        message={`Are you sure you want to delete "${apiData.apiName}"? All monitoring logs will be permanently deleted.`}
        confirmText="Delete"
        danger
      />

      {testModal && (
        <TestApiModal
          apiId={id}
          apiName={apiData.apiName}
          onClose={() => setTestModal(false)}
        />
      )}
    </div>
  );
}
