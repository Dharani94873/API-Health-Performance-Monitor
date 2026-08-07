import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BiSolidCheckCircle, BiSolidXCircle, BiSolidWrench } from 'react-icons/bi';
import { MdMonitor, MdRefresh } from 'react-icons/md';
import api from '../services/api';
import { formatMs, timeAgo } from '../utils/helpers';

export default function PublicStatusPage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/apis/public/status/${userId}`);
      setData(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load status page. User may not exist or has no active endpoints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading System Status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center border border-red-500/20">
          <BiSolidXCircle className="text-red-500 mx-auto mb-3" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">Status Page Unavailable</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { user, systemStatus, apis, updatedAt } = data || {};
  const isOperational = systemStatus === 'All Systems Operational';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-xl object-cover" /> : <MdMonitor size={22} />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.name}'s Services</h1>
              <p className="text-xs text-slate-400">Live Uptime & System Health</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={fetchStatus} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all">
              <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Global Banner */}
        <div className={`p-6 rounded-2xl border flex items-center gap-4 transition-all ${
          isOperational 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {isOperational ? <BiSolidCheckCircle size={32} /> : <BiSolidXCircle size={32} />}
          <div>
            <h2 className="text-xl font-bold">{systemStatus}</h2>
            <p className="text-xs opacity-80">Last updated {timeAgo(updatedAt)}</p>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Monitored Endpoints ({apis?.length || 0})</h3>
          
          <div className="grid gap-3">
            {apis?.map((item) => {
              const isHealthy = item.lastStatus === 'healthy';
              const isMaint = item.lastStatus === 'maintenance';
              return (
                <div key={item._id} className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800/80 bg-slate-900/60 rounded-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{item.method}</span>
                      <h4 className="font-bold text-white text-base">{item.apiName}</h4>
                      {item.tags?.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{t}</span>
                      ))}
                    </div>
                    {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Uptime</p>
                      <p className="text-sm font-bold text-slate-200">{item.uptimePercentage}%</p>
                    </div>

                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                      isHealthy ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      isMaint ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {isHealthy ? <BiSolidCheckCircle size={16} /> : isMaint ? <BiSolidWrench size={16} /> : <BiSolidXCircle size={16} />}
                      <span>{isHealthy ? 'Operational' : isMaint ? 'Maintenance' : 'Outage'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-slate-800 text-xs text-slate-500">
          Powered by <span className="font-semibold text-slate-400">API Health & Performance Monitor</span>
        </div>

      </div>
    </div>
  );
}
