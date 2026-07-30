import { NavLink, useNavigate } from 'react-router-dom';
import {
  MdDashboard, MdAdd, MdAnalytics, MdNotifications, MdPerson,
  MdClose, MdMonitor, MdLogout, MdSettings,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/helpers';

const navLinks = [
  { to: '/dashboard', icon: MdDashboard, label: 'Dashboard' },
  { to: '/apis/add', icon: MdAdd, label: 'Add API' },
  { to: '/analytics', icon: MdAnalytics, label: 'Analytics' },
  { to: '/notifications', icon: MdNotifications, label: 'Notifications' },
  { to: '/profile', icon: MdPerson, label: 'Profile' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-dark-900/95 backdrop-blur-xl border-r border-white/5 z-30
        flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
            <MdMonitor className="text-white text-lg" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">API Monitor</p>
            <p className="text-xs text-slate-500">Health & Performance</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1">
          <MdClose size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider px-3 mb-2">Menu</p>
        {navLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
            ) : getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <MdLogout size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
