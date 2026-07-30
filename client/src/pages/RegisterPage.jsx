import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdMonitor, MdPerson, MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdCheck } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength];

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-violet-600/20 to-primary-600/20 items-center justify-center relative overflow-hidden">
        <div className="z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center mx-auto mb-6">
            <MdMonitor className="text-white text-4xl" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Start Monitoring</h2>
          {[
            'Monitor unlimited API endpoints',
            'Real-time performance analytics',
            'Instant down-time alerts',
            'Beautiful dashboard & reports',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-slate-400 text-sm mb-2 justify-center">
              <MdCheck className="text-emerald-400 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <MdMonitor className="text-white" />
            </div>
            <span className="font-bold text-white">API Monitor</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
          <p className="text-slate-500 text-sm mb-8">Start monitoring your APIs in minutes</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <MdPerson className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength >= 3 ? 'text-emerald-400' : strength >= 2 ? 'text-amber-400' : 'text-red-400'}`}>{strengthLabel}</p>
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="register-confirm"
                  type="password"
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  className={`input-field pl-10 ${form.confirm && form.confirm !== form.password ? 'border-red-500/50' : ''}`}
                  placeholder="Repeat password"
                  required
                />
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
