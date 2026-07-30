import { Link } from 'react-router-dom';
import { MdMonitor, MdArrowBack } from 'react-icons/md';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="text-center animate-fade-in">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500/20 to-violet-500/20 border border-primary-500/20 flex items-center justify-center mx-auto mb-6">
          <MdMonitor className="text-primary-400" size={40} />
        </div>
        <p className="text-8xl font-black gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-slate-500 max-w-sm mx-auto mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="btn-secondary"><MdArrowBack /> Home</Link>
          <Link to="/dashboard" className="btn-primary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
