import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdMenu, MdSearch, MdNotifications, MdSunny, MdNightlight } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function TopNav({ onMenuClick }) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data } = await api.get('/alerts?resolved=false&limit=1');
        setUnreadCount(data.unreadCount || 0);
      } catch {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/dashboard?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5"
        >
          <MdMenu size={22} />
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative hidden sm:block">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search APIs..."
            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 
                       placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 w-52"
          />
        </form>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          title="Toggle theme"
        >
          {isDark ? <MdSunny size={18} /> : <MdNightlight size={18} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <MdNotifications size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white hover:opacity-90 transition-opacity"
        >
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </button>
      </div>
    </header>
  );
}
