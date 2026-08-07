import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdAdd, MdRefresh, MdSearch, MdFilterList, MdDashboard } from 'react-icons/md';
import { BiSolidCheckCircle, BiSolidXCircle, BiSolidTimer } from 'react-icons/bi';
import StatCard from '../components/StatCard';
import ApiCard from '../components/ApiCard';
import Modal from '../components/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatMs, timeAgo } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, apisRes] = await Promise.all([
        api.get('/analytics'),
        api.get(`/apis?limit=100`),
      ]);
      setAnalytics(analyticsRes.data.analytics);
      setApis(apisRes.data.apis);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const searchQ = searchParams.get('search');
    if (searchQ) setSearch(searchQ);
  }, [searchParams]);

  const handleDelete = async () => {
    try {
      await api.delete(`/apis/${deleteModal.id}`);
      toast.success('API deleted');
      setDeleteModal({ open: false, id: null, name: '' });
      fetchData();
    } catch {
      toast.error('Failed to delete API');
    }
  };

  const handleToggle = async (id, currentActive) => {
    try {
      await api.patch(`/apis/${id}/toggle`);
      toast.success(currentActive ? 'API paused' : 'API activated');
      fetchData();
    } catch {
      toast.error('Failed to toggle API');
    }
  };

  // Filter APIs
  const filteredApis = apis.filter(a => {
    const matchSearch = !search || a.apiName.toLowerCase().includes(search.toLowerCase()) || a.apiUrl.toLowerCase().includes(search.toLowerCase());
    
    let matchFilter = true;
    if (filter === 'active') matchFilter = a.active;
    else if (filter === 'inactive') matchFilter = !a.active;
    else if (filter === 'healthy') matchFilter = a.lastStatus === 'healthy';
    else if (filter === 'down') matchFilter = a.lastStatus === 'down';
    else if (filter === 'none') matchFilter = !a.authentication || a.authentication.type === 'none';
    else if (filter === 'apiKey') matchFilter = a.authentication?.type === 'apiKey';
    else if (filter === 'bearer') matchFilter = a.authentication?.type === 'bearer';
    else if (filter === 'basic') matchFilter = a.authentication?.type === 'basic';
    else if (filter === 'custom') matchFilter = a.authentication?.type === 'custom';

    return matchSearch && matchFilter;
  });

  const PIE_COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdDashboard className="text-primary-400" /> Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {analytics ? `Last updated ${timeAgo(analytics.lastChecked)}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="btn-secondary" title="Refresh">
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/apis/add')} className="btn-primary">
            <MdAdd size={18} /> Add API
          </button>
        </div>
      </div>

      {/* Stat Cards - Extended */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={MdDashboard} label="Total APIs" value={filteredApis.length} color="primary" loading={loading} />
        <StatCard icon={BiSolidCheckCircle} label="Healthy APIs" value={filteredApis.filter(a => a.lastStatus === 'healthy').length} color="emerald" loading={loading} />
        <StatCard icon={BiSolidXCircle} label="Failed APIs" value={filteredApis.filter(a => a.lastStatus === 'down').length} color="red" loading={loading} />
        <StatCard icon={BiSolidTimer} label="Avg Response" value={analytics ? formatMs(analytics.avgResponseTime) : '—'} color="amber" loading={loading} />
        <StatCard icon={MdDashboard} label="Requests Today" value={analytics?.todayChecks ?? '—'} color="primary" loading={loading} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={BiSolidCheckCircle} label="Avg Uptime" value={analytics ? `${analytics.avgAvailability}%` : '—'} color="emerald" loading={loading} />
        <StatCard icon={BiSolidTimer} label="Fastest API" value={analytics?.fastestApi?.apiName?.slice(0, 12) || '—'} color="primary" loading={loading} />
        <StatCard icon={BiSolidTimer} label="Slowest API" value={analytics?.slowestApi?.apiName?.slice(0, 12) || '—'} color="amber" loading={loading} />
        <StatCard icon={MdDashboard} label="SSL Warnings" value={analytics?.sslWarnings ?? '—'} color={analytics?.sslWarnings > 0 ? 'red' : 'emerald'} loading={loading} />
        <StatCard icon={BiSolidCheckCircle} label="Health Score" value={analytics?.avgHealthScore !== null ? `${analytics?.avgHealthScore ?? '—'}/100` : '—'} color="primary" loading={loading} />
      </div>


      {/* Charts Row */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Response Time Trend */}
          <div className="lg:col-span-2 glass-card p-5">
            <h3 className="font-semibold text-white mb-4">Response Time Trend (7 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Line type="monotone" dataKey="avgResponseTime" name="Avg RT" stroke="#818cf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Success vs Failure */}
          <div className="glass-card p-5 flex flex-col">
            <h3 className="font-semibold text-white mb-4">Success vs Failure (7d)</h3>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Success', value: analytics.successCount || 0 },
                      { name: 'Failed', value: analytics.failureCount || 0 },
                    ]}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={4} dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* API List */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-white">Your APIs ({filteredApis.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/30 w-40"
              />
            </div>
            {/* Filters Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary-500/30"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              <optgroup label="Status">
                <option value="all">All APIs</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="healthy">Healthy</option>
                <option value="down">Down</option>
              </optgroup>
              <optgroup label="Authentication">
                <option value="none">No Auth</option>
                <option value="apiKey">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="custom">Custom Headers</option>
              </optgroup>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
          </div>
        ) : filteredApis.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <MdDashboard className="text-slate-700 mx-auto mb-3" size={48} />
            <p className="text-slate-500 mb-4">No APIs found. Add your first API to start monitoring.</p>
            <button onClick={() => navigate('/apis/add')} className="btn-primary inline-flex">
              <MdAdd /> Add API
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApis.map(a => (
              <ApiCard
                key={a._id}
                api={a}
                onDelete={(id, name) => setDeleteModal({ open: true, id, name })}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
        onConfirm={handleDelete}
        title="Delete API?"
        message={`Are you sure you want to delete "${deleteModal.name}"? All monitoring logs will be permanently deleted.`}
        confirmText="Delete"
        danger
      />
    </div>
  );
}
