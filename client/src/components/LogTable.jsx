import { formatDate, formatMs, getStatusClass, getMethodColor } from '../utils/helpers';
import { MdCheckCircle, MdCancel } from 'react-icons/md';

export default function LogTable({ logs, loading }) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
