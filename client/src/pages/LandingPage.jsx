import { Link } from 'react-router-dom';
import { MdMonitor, MdTrendingUp, MdNotifications, MdSecurity, MdArrowForward, MdCheck } from 'react-icons/md';

const features = [
  { icon: MdMonitor, title: 'Real-Time Monitoring', desc: 'Monitor your APIs every minute with instant status updates and detailed logs.', color: 'text-primary-400 bg-primary-500/10' },
  { icon: MdTrendingUp, title: 'Performance Analytics', desc: 'Beautiful charts showing response times, uptime trends and performance over time.', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: MdNotifications, title: 'Instant Alerts', desc: 'Get notified immediately when your APIs go down or respond with unexpected status codes.', color: 'text-amber-400 bg-amber-500/10' },
  { icon: MdSecurity, title: 'Secure & Reliable', desc: 'JWT authentication, rate limiting, and helmet security for production-ready monitoring.', color: 'text-violet-400 bg-violet-500/10' },
];

const stats = [
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '< 1min', label: 'Check Interval' },
  { value: '100+', label: 'APIs Supported' },
  { value: '24/7', label: 'Monitoring' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
            <MdMonitor className="text-white text-lg" />
          </div>
          <span className="font-bold text-white">API Monitor</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors px-4 py-2">
            Login
          </Link>
          <Link to="/register" className="btn-primary text-sm">
            Get Started <MdArrowForward />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
          Production-Ready API Monitoring
        </div>
        <h1 className="text-5xl lg:text-7xl font-black text-white mb-6 leading-tight">
          Monitor Your APIs{' '}
          <span className="gradient-text">Intelligently</span>
        </h1>
        <p className="text-slate-400 text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Track uptime, response times, and performance of all your API endpoints with real-time 
          monitoring, beautiful analytics dashboards, and instant alerts.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register" className="btn-primary text-base px-6 py-3">
            Start Monitoring Free <MdArrowForward />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-6 py-3">
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="glass-card p-5 text-center">
              <p className="text-3xl font-black gradient-text mb-1">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold text-white text-center mb-10">Everything you need to monitor APIs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="glass-card-hover p-6">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon size={24} />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 pb-24 text-center">
        <div className="glass-card p-10 bg-gradient-to-br from-primary-500/10 to-violet-500/10 border-primary-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">Start monitoring today</h2>
          <p className="text-slate-400 mb-6">Join developers who trust API Monitor for their critical infrastructure.</p>
          <Link to="/register" className="btn-primary text-base px-8 py-3 inline-flex">
            Create Free Account <MdArrowForward />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-6 text-center text-slate-600 text-sm">
        © {new Date().getFullYear()} API Health & Performance Monitor. Built with MERN Stack.
      </footer>
    </div>
  );
}
