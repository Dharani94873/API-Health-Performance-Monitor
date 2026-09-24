import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BiSolidCheckCircle, BiSolidXCircle, BiSolidWrench } from 'react-icons/bi';
import { MdMonitor, MdRefresh, MdAccessTime, MdSmartToy, MdArrowBack } from 'react-icons/md';
import api from '../services/api';
import { timeAgo } from '../utils/helpers';

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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-semibold">Loading Live System Status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 text-center border border-rose-200 shadow-lg rounded-2xl space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
            <BiSolidXCircle size={36} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Status Page Unavailable</h2>
            <p className="text-slate-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { user, systemStatus, apis, aiProviders, updatedAt } = data || {};
  const isOperational = systemStatus === 'All Systems Operational';

  const getMethodBadgeClass = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'POST': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PUT': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PATCH': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const renderStatusPill = (status) => {
    if (status === 'healthy') {
      return (
        <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
          <BiSolidCheckCircle size={15} className="text-emerald-600" />
          <span>Operational</span>
        </div>
      );
    }
    if (status === 'maintenance') {
      return (
        <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
          <BiSolidWrench size={15} className="text-amber-600" />
          <span>Maintenance</span>
        </div>
      );
    }
    return (
      <div className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
        <BiSolidXCircle size={15} className="text-rose-600" />
        <span>Degraded / Down</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4 sm:p-8 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Header Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <MdMonitor size={24} style={{ color: '#ffffff' }} />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {user?.name || 'System'}'s Services
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOperational ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOperational ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <p className="text-xs font-medium text-slate-500">Live Uptime & System Health</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline-flex items-center gap-1">
              <MdAccessTime size={14} /> Updated {timeAgo(updatedAt)}
            </span>
            <button
              onClick={fetchStatus}
              title="Refresh status"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-xs"
            >
              <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Global Status Banner */}
        <div className={`p-6 rounded-2xl border shadow-sm flex items-center gap-4 transition-all ${
          isOperational 
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50/90 border-rose-200 text-rose-900'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isOperational ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}>
            {isOperational ? <BiSolidCheckCircle size={30} /> : <BiSolidXCircle size={30} />}
          </div>
          <div>
            <h2 className="text-xl font-bold">{systemStatus}</h2>
            <p className={`text-xs font-medium mt-0.5 ${isOperational ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isOperational
                ? 'All monitored services and microservices are operating with optimal health.'
                : 'One or more services are experiencing elevated latency or outages.'}
            </p>
          </div>
        </div>

        {/* Monitored Endpoints List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span>Monitored Endpoints</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-bold">
                {apis?.length || 0}
              </span>
            </h3>
            <span className="text-xs text-slate-500">Auto-refreshed every minute</span>
          </div>
          
          <div className="grid gap-3">
            {apis?.map((item) => (
              <div
                key={item._id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border ${getMethodBadgeClass(item.method)}`}>
                      {item.method}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">{item.apiName}</h4>
                    {item.healthGrade && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Grade {item.healthGrade}
                      </span>
                    )}
                    {item.tags?.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 max-w-xl">{item.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-6 self-end sm:self-auto">
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Uptime</p>
                    <p className="text-base font-extrabold text-slate-900">{item.uptimePercentage}%</p>
                  </div>

                  {renderStatusPill(item.lastStatus)}
                </div>
              </div>
            ))}

            {(!apis || apis.length === 0) && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                No monitored endpoints configured yet.
              </div>
            )}
          </div>
        </div>

        {/* Monitored AI Providers List (if any) */}
        {aiProviders && aiProviders.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <MdSmartToy size={16} className="text-indigo-600" />
                <span>Monitored AI Providers</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                  {aiProviders.length}
                </span>
              </h3>
            </div>

            <div className="grid gap-3">
              {aiProviders.map((item) => (
                <div
                  key={item._id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        AI MODEL
                      </span>
                      <h4 className="font-bold text-slate-900 text-base">{item.providerName}</h4>
                      {item.model && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {item.model}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Uptime</p>
                      <p className="text-base font-extrabold text-slate-900">{item.uptimePercentage}%</p>
                    </div>

                    {renderStatusPill(item.lastStatus)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center pt-10 pb-4 text-xs text-slate-500 border-t border-slate-200/80 mt-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>
          Powered by{' '}
          <Link to="/" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
            API Health & Performance Monitor
          </Link>
        </p>
        <p className="text-slate-500">Updated automatically every 60 seconds</p>
      </footer>
    </div>
  );
}
