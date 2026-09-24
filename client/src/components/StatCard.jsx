export default function StatCard({ icon: Icon, label, value, trend, color = 'primary', loading }) {
  const themeMap = {
    primary: {
      gradient: 'from-indigo-600 via-indigo-500 to-violet-600',
      textGradient: 'gradient-text-primary',
      border: 'border-slate-200/90 hover:border-indigo-300',
      iconShadow: 'shadow-indigo-500/25',
    },
    emerald: {
      gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
      textGradient: 'gradient-text-emerald',
      border: 'border-slate-200/90 hover:border-emerald-300',
      iconShadow: 'shadow-emerald-500/25',
    },
    red: {
      gradient: 'from-rose-600 via-rose-500 to-red-500',
      textGradient: 'gradient-text-sunset',
      border: 'border-slate-200/90 hover:border-rose-300',
      iconShadow: 'shadow-rose-500/25',
    },
    amber: {
      gradient: 'from-amber-500 via-amber-600 to-orange-500',
      textGradient: 'gradient-text-amber',
      border: 'border-slate-200/90 hover:border-amber-300',
      iconShadow: 'shadow-amber-500/25',
    },
    blue: {
      gradient: 'from-blue-600 via-cyan-500 to-teal-500',
      textGradient: 'gradient-text-cyan',
      border: 'border-slate-200/90 hover:border-blue-300',
      iconShadow: 'shadow-blue-500/25',
    },
    violet: {
      gradient: 'from-violet-600 via-purple-500 to-pink-500',
      textGradient: 'gradient-text-violet',
      border: 'border-slate-200/90 hover:border-purple-300',
      iconShadow: 'shadow-violet-500/25',
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
    <div className={`bg-white rounded-2xl p-5 border ${theme.border} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group`}>
      {/* Top Gradient Accent Stripe */}
      <div className={`h-1.5 w-full absolute top-0 left-0 bg-gradient-to-r ${theme.gradient}`} />

      {/* Header: Icon + Trend Badge */}
      <div className="flex items-start justify-between mb-3.5">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white shadow-md ${theme.iconShadow} transition-transform group-hover:scale-105 duration-200`}>
          {Icon && <Icon size={22} style={{ color: '#ffffff' }} />}
        </div>
        {trend !== undefined && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            trend >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      {/* Label */}
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>

      {/* Value in Rich Gradient Text */}
      <div className="flex items-baseline overflow-hidden">
        <span className={`text-2xl sm:text-3xl font-black font-heading tracking-tight truncate ${theme.textGradient}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
