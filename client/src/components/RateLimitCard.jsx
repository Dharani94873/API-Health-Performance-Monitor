/**
 * RateLimitCard — shows API quota / rate limit information
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MdSpeed } from 'react-icons/md';

export default function RateLimitCard({ quotaLimit, quotaRemaining, quotaUsed, quotaReset, quotaHistory = [] }) {
  const hasData = quotaLimit || quotaRemaining !== null;

  if (!hasData && !quotaHistory.length) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <MdSpeed size={18} style={{ color: 'var(--text-muted)' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Rate Limit</p>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          No rate limit headers detected. Tracking request count.
        </p>
      </div>
    );
  }

  const pct = quotaLimit && quotaRemaining !== null
    ? Math.round(((quotaLimit - quotaRemaining) / quotaLimit) * 100)
    : null;

  const barColor = pct === null ? '#6366f1' : pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <MdSpeed size={18} style={{ color: '#6366f1' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Rate Limit / Quota</p>
      </div>

      {hasData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <div className="glass-card p-3" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{quotaLimit ?? '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Limit</p>
          </div>
          <div className="glass-card p-3" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: barColor }}>{quotaRemaining ?? '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Remaining</p>
          </div>
          <div className="glass-card p-3" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{quotaUsed ?? (quotaLimit && quotaRemaining !== null ? quotaLimit - quotaRemaining : '—')}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Used</p>
          </div>
        </div>
      )}

      {pct !== null && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Usage</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>{pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-card-hover)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
          </div>
          {quotaReset && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Resets: {new Date(quotaReset).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {quotaHistory.length > 1 && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Historical Usage</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={quotaHistory} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <XAxis dataKey="checkedAt" hide />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [v, 'Used']}
                labelFormatter={() => ''}
                contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 8 }}
              />
              <Bar dataKey="used" fill={barColor} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
