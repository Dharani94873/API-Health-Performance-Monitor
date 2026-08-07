import { useState, useEffect, useCallback } from 'react';
import { MdAnalytics, MdTrendingUp, MdSpeed, MdDownload } from 'react-icons/md';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs } from '../utils/helpers';

const tooltipStyle = {
  contentStyle: { background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10 },
  labelStyle: { color: 'var(--text-muted)' },
};

function ChartCard({ title, children }) {
  return (
    <div className="glass-card p-5">
      <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/analytics');
      setAnalytics(data.analytics);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/reports/csv?days=30', { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `analytics-report-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Report exported!');
    } catch { toast.error('Export failed'); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 rounded-2xl w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const {
    dailyTrend = [], weeklyPerformance = [], monthlyAvailability = [],
    apiPerformance = [], successCount = 0, failureCount = 0,
  } = analytics || {};

  const pieData = [
    { name: 'Success', value: successCount },
    { name: 'Failed', value: failureCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <MdAnalytics style={{ color: '#6366f1' }} size={28} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Analytics</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Performance insights & trends</p>
          </div>
        </div>
        <button onClick={handleExportCSV} className="btn-secondary"><MdDownload size={18} /> Export CSV</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Checks (7d)', value: successCount + failureCount, color: '#6366f1' },
          { label: 'Success Rate', value: `${successCount + failureCount > 0 ? Math.round(successCount / (successCount + failureCount) * 100) : 0}%`, color: '#10b981' },
          { label: 'Avg Response', value: formatMs(analytics?.avgResponseTime), color: '#f59e0b' },
          { label: 'p95 Response', value: formatMs(analytics?.p95ResponseTime), color: '#ec4899' },
          { label: 'p99 Response', value: formatMs(analytics?.p99ResponseTime), color: '#ef4444' },
          { label: 'Avg Availability', value: `${analytics?.avgAvailability ?? '—'}%`, color: '#8b5cf6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Response Time Trend */}
        <ChartCard title={<><MdTrendingUp style={{ color: '#6366f1' }} size={16} /> Response Time (7 days)</>}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="avgResponseTime" name="Avg RT" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Success vs Failure */}
        <ChartCard title="Success vs Failure (7d)">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" iconSize={10}
                  formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Daily Requests Bar Chart */}
        <ChartCard title="Daily Request Volume (7d)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="checks" name="Total Checks" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Uptime / Availability Trend */}
        <ChartCard title="Uptime Trend (7 days)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="uptime" name="Uptime %" stroke="#10b981" fill="rgba(16,185,129,0.15)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Weekly Performance */}
        {weeklyPerformance.length > 0 && (
          <ChartCard title="Weekly Performance (4 weeks)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="uptime" name="Uptime %" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="avgResponseTime" name="Avg RT (ms)" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Monthly Availability */}
        {monthlyAvailability.length > 0 && (
          <ChartCard title="Monthly Availability (6 months)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyAvailability}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="availability" name="Availability %" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Response Size Trend */}
        {dailyTrend.some(d => d.avgSize > 0) && (
          <ChartCard title="Avg Response Size Trend (7d)">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyTrend.filter(d => d.avgSize > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1024).toFixed(0)}KB`} />
                <Tooltip {...tooltipStyle} formatter={v => [`${(v / 1024).toFixed(2)} KB`, 'Avg Size']} />
                <Area type="monotone" dataKey="avgSize" name="Avg Size" stroke="#f59e0b" fill="rgba(245,158,11,0.15)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* API Performance Table */}
      {apiPerformance.length > 0 && (
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdSpeed style={{ color: '#6366f1' }} size={16} /> API Performance (last 24h)
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="table-header">API Name</th>
                <th className="table-header">Avg Response Time</th>
                <th className="table-header">Status</th>
                <th className="table-header">Health Score</th>
              </tr>
            </thead>
            <tbody>
              {apiPerformance.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="table-cell" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{a.apiName}</td>
                  <td className="table-cell" style={{ color: a.avgRT < 500 ? '#10b981' : a.avgRT < 2000 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{formatMs(a.avgRT)}</td>
                  <td className="table-cell">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: a.lastStatus === 'healthy' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: a.lastStatus === 'healthy' ? '#10b981' : '#ef4444' }}>{a.lastStatus}</span>
                  </td>
                  <td className="table-cell" style={{ fontWeight: 600, color: '#6366f1' }}>{a.healthScore ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
