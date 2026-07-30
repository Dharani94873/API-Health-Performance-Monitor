import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack, MdEdit, MdDelete, MdOpenInNew, MdDownload, MdRefresh } from 'react-icons/md';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import LogTable from '../components/LogTable';
import Modal from '../components/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs, formatDate, getStatusClass, getMethodColor, timeAgo } from '../utils/helpers';

export default function ApiDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [logPage, setLogPage] = useState(1);
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
      const response = await api.get(`/logs/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data?.api?.apiName}-logs.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Logs exported!');
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

  const { api: apiData, stats, trend } = data;

  const uptimeColor = stats.uptime >= 99 ? 'text-emerald-400' : stats.uptime >= 90 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary p-2 mt-1">
            <MdArrowBack size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${getMethodColor(apiData.method)}`}>
                {apiData.method}
              </span>
              <span className={getStatusClass(apiData.lastStatus)}>
                {apiData.lastStatus || 'unknown'}
              </span>
              {!apiData.active && (
                <span className="text-xs text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">Paused</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{apiData.apiName}</h1>
            <a href={apiData.apiUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
              {apiData.apiUrl} <MdOpenInNew size={14} />
            </a>
            {apiData.description && <p className="text-sm text-slate-500 mt-1">{apiData.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={fetchData} className="btn-secondary p-2"><MdRefresh size={18} /></button>
          <button onClick={handleExportCSV} className="btn-secondary"><MdDownload size={18} /> Export CSV</button>
          <button onClick={() => navigate(`/apis/${id}/edit`)} className="btn-secondary"><MdEdit size={18} /> Edit</button>
          <button onClick={() => setDeleteModal(true)} className="btn-danger"><MdDelete size={18} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Uptime', value: `${stats.uptime}%`, colorClass: uptimeColor },
          { label: 'Avg Latency', value: formatMs(stats.avgLatency), colorClass: 'text-primary-400' },
          { label: 'Min Latency', value: formatMs(stats.minLatency), colorClass: 'text-emerald-400' },
          { label: 'Max Latency', value: formatMs(stats.maxLatency), colorClass: 'text-red-400' },
          { label: 'Total Checks', value: stats.totalChecks, colorClass: 'text-amber-400' },
        ].map(({ label, value, colorClass }) => (
          <div key={label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${colorClass} mb-1`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-3">API Configuration</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Expected Status', value: apiData.expectedStatus },
            { label: 'Timeout', value: formatMs(apiData.timeout) },
            { label: 'Check Interval', value: `${apiData.interval} min` },
            { label: 'Last Checked', value: timeAgo(apiData.lastChecked) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/3 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-white">{value || 'N/A'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Response Time Chart */}
      {trend.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Response Time History</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="index" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line
                type="monotone"
                dataKey="responseTime"
                name="Response Time"
                stroke="#818cf8"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return payload.success
                    ? <circle key={`dot-${props.index}`} cx={cx} cy={cy} r={3} fill="#10b981" stroke="none" />
                    : <circle key={`dot-fail-${props.index}`} cx={cx} cy={cy} r={4} fill="#ef4444" stroke="none" />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Logs Table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Monitoring History <span className="text-slate-500 font-normal text-sm">({logTotal} total)</span></h3>
        </div>
        <LogTable logs={logs} loading={logsLoading} />
      </div>

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete API?"
        message={`Are you sure you want to delete "${apiData.apiName}"? All monitoring logs will be permanently deleted.`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
