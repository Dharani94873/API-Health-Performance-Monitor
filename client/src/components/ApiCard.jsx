import { useNavigate } from 'react-router-dom';
import { MdEdit, MdDelete, MdPause, MdPlayArrow, MdOpenInNew, MdAccessTime } from 'react-icons/md';
import { getStatusClass, formatMs, timeAgo, getMethodColor, truncate } from '../utils/helpers';

export default function ApiCard({ api, onDelete, onToggle }) {
  const navigate = useNavigate();

  const uptimeColor = api.uptimePercentage >= 99 ? 'text-emerald-400'
    : api.uptimePercentage >= 90 ? 'text-amber-400' : 'text-red-400';

  return (
    <div
      className="glass-card p-5 cursor-pointer hover:border-white/20 transition-all duration-300 group animate-fade-in"
      onClick={() => navigate(`/apis/${api._id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${getMethodColor(api.method)}`}>
              {api.method}
            </span>
            <span className={getStatusClass(api.lastStatus)}>
              <span className={`pulse-dot ${
                api.lastStatus === 'healthy' ? 'bg-emerald-400' :
                api.lastStatus === 'down' ? 'bg-red-400' :
                api.lastStatus === 'degraded' ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
              {api.lastStatus || 'unknown'}
            </span>
          </div>
          <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
            {api.apiName}
          </h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">{truncate(api.apiUrl, 50)}</p>
        </div>
        {!api.active && (
          <span className="text-xs text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20 ml-2 flex-shrink-0">
            Paused
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/3 rounded-lg p-2.5 text-center">
          <p className={`text-base font-bold ${uptimeColor}`}>{api.uptimePercentage}%</p>
          <p className="text-xs text-slate-600">Uptime</p>
        </div>
        <div className="bg-white/3 rounded-lg p-2.5 text-center">
          <p className="text-base font-bold text-slate-300">{api.interval}m</p>
          <p className="text-xs text-slate-600">Interval</p>
        </div>
        <div className="bg-white/3 rounded-lg p-2.5 text-center">
          <p className="text-base font-bold text-slate-300">{api.expectedStatus}</p>
          <p className="text-xs text-slate-600">Expect</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-slate-600 text-xs">
          <MdAccessTime size={12} />
          {api.lastChecked ? timeAgo(api.lastChecked) : 'Not checked yet'}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/apis/${api._id}/edit`); }}
            className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
            title="Edit"
          >
            <MdEdit size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(api._id, api.active); }}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
            title={api.active ? 'Pause' : 'Resume'}
          >
            {api.active ? <MdPause size={14} /> : <MdPlayArrow size={14} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(api._id, api.apiName); }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Delete"
          >
            <MdDelete size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
