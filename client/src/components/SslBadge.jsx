/**
 * SslBadge — shows SSL certificate status and days remaining
 */
import { MdLock, MdLockOpen, MdWarning, MdHelp } from 'react-icons/md';

export default function SslBadge({ sslValid, sslExpiry, sslDaysRemaining, sslIssuer, compact = false }) {
  if (sslValid === null || sslValid === undefined) {
    return (
      <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <MdHelp size={16} />
        {!compact && <span style={{ fontSize: 13 }}>SSL: Not checked</span>}
      </div>
    );
  }

  const isExpiringSoon = sslDaysRemaining !== null && sslDaysRemaining <= 30;
  const isExpired = sslDaysRemaining !== null && sslDaysRemaining <= 0;

  let color = '#10b981';
  let bg = 'rgba(16,185,129,0.12)';
  let border = 'rgba(16,185,129,0.3)';
  let Icon = MdLock;
  let label = `Valid · ${sslDaysRemaining}d`;

  if (!sslValid || isExpired) {
    color = '#ef4444'; bg = 'rgba(239,68,68,0.12)'; border = 'rgba(239,68,68,0.3)';
    Icon = MdLockOpen; label = 'Invalid / Expired';
  } else if (isExpiringSoon) {
    color = '#f59e0b'; bg = 'rgba(245,158,11,0.12)'; border = 'rgba(245,158,11,0.3)';
    Icon = MdWarning; label = `Expiring · ${sslDaysRemaining}d`;
  }

  if (compact) {
    return (
      <div title={`SSL: ${label}${sslIssuer ? ` · Issued by ${sslIssuer}` : ''}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: bg, border: `1px solid ${border}`, color }}>
        <Icon size={12} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>SSL Certificate</p>
          <span style={{ fontSize: 12, fontWeight: 600, color, background: bg, padding: '1px 8px', borderRadius: 20, border: `1px solid ${border}` }}>{label}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {sslExpiry && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Expires</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              {new Date(sslExpiry).toLocaleDateString()}
            </p>
          </div>
        )}
        {sslDaysRemaining !== null && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Days Left</p>
            <p style={{ fontSize: 13, fontWeight: 600, color }}>{sslDaysRemaining} days</p>
          </div>
        )}
        {sslIssuer && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Issuer</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sslIssuer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
