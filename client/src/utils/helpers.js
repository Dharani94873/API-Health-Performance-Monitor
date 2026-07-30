/**
 * Format milliseconds to human readable
 */
export const formatMs = (ms) => {
  if (!ms && ms !== 0) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Time ago
 */
export const timeAgo = (date) => {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Get status color classes
 */
export const getStatusClass = (status) => {
  const map = {
    healthy: 'status-healthy',
    down: 'status-down',
    degraded: 'status-degraded',
    unknown: 'status-unknown',
  };
  return map[status] || 'status-unknown';
};

/**
 * Get response time color
 */
export const getRTColor = (ms) => {
  if (!ms) return 'text-slate-400';
  if (ms < 500) return 'text-emerald-400';
  if (ms < 1500) return 'text-amber-400';
  return 'text-red-400';
};

/**
 * Truncate text
 */
export const truncate = (str, n = 40) =>
  str && str.length > n ? str.slice(0, n - 1) + '…' : str;

/**
 * Generate initials for avatar
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

/**
 * HTTP method badge color
 */
export const getMethodColor = (method) => {
  const map = {
    GET: 'text-emerald-400 bg-emerald-500/10',
    POST: 'text-blue-400 bg-blue-500/10',
    PUT: 'text-amber-400 bg-amber-500/10',
    PATCH: 'text-orange-400 bg-orange-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
    HEAD: 'text-purple-400 bg-purple-500/10',
    OPTIONS: 'text-slate-400 bg-slate-500/10',
  };
  return map[method] || 'text-slate-400 bg-slate-500/10';
};
