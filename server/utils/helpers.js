/**
 * Format milliseconds to human-readable string
 */
const formatDuration = (ms) => {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Get status color/label
 */
const getStatusInfo = (status) => {
  const map = {
    healthy: { label: 'Healthy', color: 'green' },
    degraded: { label: 'Degraded', color: 'yellow' },
    down: { label: 'Down', color: 'red' },
    unknown: { label: 'Unknown', color: 'gray' },
  };
  return map[status] || map.unknown;
};

/**
 * Paginate array
 */
const paginate = (array, page, limit) => {
  const start = (page - 1) * limit;
  return array.slice(start, start + limit);
};

module.exports = { formatDuration, getStatusInfo, paginate };
