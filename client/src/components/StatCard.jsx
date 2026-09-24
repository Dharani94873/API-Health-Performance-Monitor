export default function StatCard({ icon: Icon, label, value, trend, color = 'primary', loading }) {
  const iconThemeMap = {
    primary: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    violet: 'bg-purple-50 text-purple-600 border-purple-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  };

  const iconClasses = iconThemeMap[color] || iconThemeMap.primary;

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
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between">
      {/* Top Header: Icon + Trend Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${iconClasses} border flex items-center justify-center shadow-xs`}>
          {Icon && <Icon size={22} />}
        </div>
        {trend !== undefined && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            trend >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      {/* Label & Value */}
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
