/**
 * HealthScoreGauge — circular SVG gauge showing API health score
 */
import { useMemo } from 'react';

const GRADES = {
  Excellent: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Excellent' },
  Good:      { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Good' },
  Average:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Average' },
  Poor:      { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Poor' },
};

export default function HealthScoreGauge({ score, grade, size = 120 }) {
  const info = GRADES[grade] || GRADES.Poor;
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const safeScore = score ?? 0;
  const strokeDashoffset = useMemo(
    () => circumference - (safeScore / 100) * circumference,
    [safeScore, circumference]
  );

  if (score === null || score === undefined) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div style={{ width: size, height: size }} className="flex items-center justify-center">
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--border-color)" strokeWidth={10}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={info.color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 700, color: info.color, lineHeight: 1 }}>
            {safeScore}
          </span>
          <span style={{ fontSize: size * 0.1, color: 'var(--text-muted)', marginTop: 2 }}>/100</span>
        </div>
      </div>
      <span style={{
        fontSize: 12, fontWeight: 600, color: info.color,
        background: info.bg, padding: '2px 10px', borderRadius: 20,
      }}>
        {info.label}
      </span>
    </div>
  );
}
