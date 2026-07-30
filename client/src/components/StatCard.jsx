export default function StatCard({ icon: Icon, label, value, trend, color = 'primary', loading }) {
  const colorMap = {
    primary: 'from-primary-500/20 to-primary-600/10 border-primary-500/20 text-primary-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/20 text-red-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
  };

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-12 w-12 rounded-xl mb-4" />
        <div className="skeleton h-4 w-20 rounded mb-2" />
        <div className="skeleton h-7 w-16 rounded" />
      </div>
    );
  }

  return (
    <div className={`glass-card p-5 border bg-gradient-to-br ${colorMap[color]} animate-fade-in`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center border ${colorMap[color]}`}>
          {Icon && <Icon size={22} className={colorMap[color].split(' ').pop()} />}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trend >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
