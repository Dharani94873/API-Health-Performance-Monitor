import { useState } from 'react';
import { formatDate, formatMs } from '../utils/helpers';
import { MdCheckCircle, MdCancel, MdCode, MdClose } from 'react-icons/md';

export default function LogTable({ logs, loading }) {
  const [selectedPayload, setSelectedPayload] = useState(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm">No logs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="table-header">Time</th>
            <th className="table-header">Status</th>
            <th className="table-header">Code</th>
            <th className="table-header">Response Time</th>
            <th className="table-header">Result</th>
            <th className="table-header">Payload</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {logs.map((log) => (
            <tr key={log._id} className="hover:bg-white/3 transition-colors">
              <td className="table-cell text-slate-500 text-xs">
                {formatDate(log.checkedAt)}
              </td>
              <td className="table-cell">
                {log.success ? (
                  <span className="status-healthy">
                    <MdCheckCircle size={12} /> Healthy
                  </span>
                ) : (
                  <span className="status-down">
                    <MdCancel size={12} /> Failed
                  </span>
                )}
              </td>
              <td className="table-cell">
                <span className={`font-mono text-xs font-bold ${
                  log.statusCode >= 200 && log.statusCode < 300 ? 'text-emerald-400' :
                  log.statusCode >= 400 ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {log.statusCode || 'N/A'}
                </span>
              </td>
              <td className="table-cell">
                <span className={`font-mono text-xs ${
                  !log.responseTime ? 'text-slate-500' :
                  log.responseTime < 500 ? 'text-emerald-400' :
                  log.responseTime < 1500 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {formatMs(log.responseTime)}
                </span>
              </td>
              <td className="table-cell">
                {log.errorMessage ? (
                  <span className="text-xs text-red-400 truncate max-w-xs block" title={log.errorMessage}>
                    {log.errorMessage.length > 40 ? log.errorMessage.slice(0, 40) + '...' : log.errorMessage}
                  </span>
                ) : (
                  <span className="text-xs text-emerald-400">OK</span>
                )}
              </td>
              <td className="table-cell">
                {log.errorPayload ? (
                  <button
                    onClick={() => setSelectedPayload({ payload: log.errorPayload, code: log.statusCode, time: log.checkedAt })}
                    className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    <MdCode size={12} /> View Error Body
                  </button>
                ) : (
                  <span className="text-xs text-slate-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Error Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-2xl w-full p-6 space-y-4 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Error Response Body</h3>
                <p className="text-xs text-slate-400">Captured Status Code: {selectedPayload.code || 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <MdClose size={20} />
              </button>
            </div>

            <pre className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto max-h-80 border border-slate-800 whitespace-pre-wrap break-all">
              {selectedPayload.payload}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedPayload(null)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
