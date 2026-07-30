import { useState, useEffect, useCallback } from 'react';
import { MdAnalytics, MdTrendingUp, MdSpeed } from 'react-icons/md';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs } from '../utils/helpers';

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 rounded-2xl w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const { dailyTrend = [], apiPerformance = [], successCount = 0, failureCount = 0 } = analytics || {};

  const pieData = [
    { name: 'Success', value: successCount },
    { name: 'Failed', value: failureCount },
  ];

  const uptimeTrend = dailyTrend.map(d => ({ ...d, uptimeDisplay: d.uptime }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MdAnalytics className="text-primary-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-500 text-sm">Performance insights for the last 7 days</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Checks (7d)', value: successCount + failureCount, color: 'text-primary-400' },
          { label: 'Success Rate', value: `${successCount + failureCount > 0 ? Math.round(successCount / (successCount + failureCount) * 100) : 0}%`, color: 'text-emerald-400' },
          { label: 'Avg Response', value: formatMs(analytics?.avgResponseTime), color: 'text-amber-400' },
          { label: 'Fastest API', value: analytics?.fastestApi?.apiName || 'N/A', color: 'text-violet-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-5">
            <p className="text-xs text-slate-500 mb-2">{label}</p>
            <p className={`text-xl font-bold ${color} truncate`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Response Time Trend */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><MdTrendingUp className="text-primary-400" /> Response Time Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#818cf8' }} />
              <Line type="monotone" dataKey="avgResponseTime" name="Avg RT" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Uptime Trend */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Daily Uptime %</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={uptimeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} />
              <Bar dataKey="uptimeDisplay" name="Uptime %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success vs Failure Pie */}
        <div className="glass-card p-5 flex flex-col">
          <h3 className="font-semibold text-white mb-4">Success vs Failure Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* API Performance Table */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><MdSpeed className="text-amber-400" /> API Performance Ranking</h3>
          {apiPerformance.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No performance data yet</p>
          ) : (
            <div className="space-y-2">
              {apiPerformance.map((item, i) => (
                <div key={item.apiId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/3">
                  <span className="text-xs font-bold text-slate-600 w-5 text-right">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.apiName}</p>
                    <div className="w-full bg-white/5 rounded-full h-1 mt-1">
                      <div
                        className={`h-1 rounded-full ${item.avgRT < 500 ? 'bg-emerald-500' : item.avgRT < 1500 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, (item.avgRT / 3000) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${item.avgRT < 500 ? 'text-emerald-400' : item.avgRT < 1500 ? 'text-amber-400' : 'text-red-400'}`}>
                    {formatMs(item.avgRT)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
