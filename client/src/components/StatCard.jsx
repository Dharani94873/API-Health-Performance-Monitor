export default function StatCard({ icon: Icon, label, value, trend, color = 'primary', loading }) {
  const themeMap = {
    primary: {
      bg: 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600',
      shadow: 'shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600',
      shadow: 'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40',
    },
    red: {
      bg: 'bg-gradient-to-br from-rose-600 via-rose-500 to-red-600',
      shadow: 'shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600',
      shadow: 'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700',
      shadow: 'shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
    },
    violet: {
      bg: 'bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600',
      shadow: 'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40',
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600',
      shadow: 'shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40',
    },
  };

  const theme = themeMap[color] || themeMap.primary;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm animate-pulse">
        <div className="skeleton h-11 w-11 rounded-xl mb-3" />
        <div className="skeleton h-3.5 w-20 rounded mb-2" />
        <div className="skeleton h-8 w-24 rounded" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 ${theme.bg} ${theme.shadow} border border-white/20 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-200 relative overflow-hidden group select-none`}
    >
      {/* Decorative ambient shine overlay */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/15 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
      <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full bg-white/10 blur-lg pointer-events-none" />

      {/* Header: Icon + Trend Badge */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner transition-transform group-hover:scale-110 duration-200">
          {Icon && <Icon size={22} style={{ color: '#ffffff' }} />}
        </div>
        {trend !== undefined && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      {/* Label */}
      <p
        className="text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10"
        style={{ color: 'rgba(255, 255, 255, 0.9)' }}
      >
        {label}
      </p>

      {/* Value */}
      <div className="flex items-baseline overflow-hidden relative z-10">
        <span
          className="text-2xl sm:text-3xl font-black font-heading tracking-tight truncate"
          style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.15)' }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
