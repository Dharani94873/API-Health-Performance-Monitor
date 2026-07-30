import { useState, useEffect, useCallback } from 'react';
import { MdNotifications, MdCheckCircle, MdDelete, MdDoneAll } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';
import { timeAgo } from '../utils/helpers';

const TYPE_CONFIG = {
  down: { label: 'Down', class: 'text-red-400 bg-red-500/10 border-red-500/20' },
  timeout: { label: 'Timeout', class: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  status_mismatch: { label: 'Status Mismatch', class: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  recovered: { label: 'Recovered', class: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = filter === 'all' ? undefined : filter === 'unresolved' ? false : true;
      const params = new URLSearchParams({ page, limit: 20 });
      if (resolved !== undefined) params.append('resolved', resolved);
      const { data } = await api.get(`/alerts?${params}`);
      setAlerts(data.alerts);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleResolve = async (id) => {
    try {
      await api.put(`/alerts/${id}`);
      toast.success('Alert resolved');
      fetchAlerts();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      toast.success('Alert deleted');
      fetchAlerts();
    } catch { toast.error('Failed'); }
  };

  const handleResolveAll = async () => {
    try {
      await api.put('/alerts/resolve-all');
      toast.success('All alerts resolved');
      fetchAlerts();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MdNotifications className="text-primary-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-slate-500 text-sm">{total} alerts total</p>
          </div>
        </div>
        <button onClick={handleResolveAll} className="btn-secondary">
          <MdDoneAll /> Resolve All
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['unresolved', 'resolved', 'all'].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)
        ) : alerts.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <MdNotifications className="text-slate-700 mx-auto mb-3" size={48} />
            <p className="text-slate-500">No alerts found. Great job keeping your APIs healthy!</p>
          </div>
        ) : (
          alerts.map(alert => {
            const typeConfig = TYPE_CONFIG[alert.type] || TYPE_CONFIG.down;
            return (
              <div
                key={alert._id}
                className={`glass-card p-4 flex items-start gap-4 ${alert.resolved ? 'opacity-60' : ''} animate-fade-in`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.class}`}>
                  <MdNotifications size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${typeConfig.class}`}>
                      {typeConfig.label}
                    </span>
                    {alert.resolved && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{timeAgo(alert.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!alert.resolved && (
                    <button onClick={() => handleResolve(alert._id)} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="Mark resolved">
                      <MdCheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(alert._id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                    <MdDelete size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={alerts.length < 20}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
