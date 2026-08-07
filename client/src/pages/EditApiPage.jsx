import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdSave, MdArrowBack, MdLock, MdPerson } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const INTERVALS = [
  { label: '1 minute', value: 1 }, { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 }, { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 }, { label: '1 hour', value: 60 },
  { label: '6 hours', value: 360 }, { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 },
];
const AUTH_TYPES = ['none', 'apiKey', 'bearer', 'basic', 'custom'];
const AUTH_LABELS = { none: 'No Auth', apiKey: 'API Key', bearer: 'Bearer Token', basic: 'Basic Auth', custom: 'Custom Headers' };

function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>{children}</h3>;
}
function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />;
}

export default function EditApiPage() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [auth, setAuth] = useState({ type: 'none', apiKey: '', apiKeyHeader: 'X-API-Key', apiKeyLocation: 'header', bearerToken: '', username: '', password: '', customHeaders: '{}' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApi = async () => {
      try {
        const { data } = await api.get(`/apis/${id}`);
        setForm(data.api);
        if (data.api.authentication) {
          setAuth(prev => ({ ...prev, type: data.api.authentication.type || 'none' }));
        }
      } catch {
        toast.error('API not found');
        navigate('/dashboard');
      }
    };
    fetchApi();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuth(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tagsArray = typeof form.tags === 'string' 
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(form.tags) ? form.tags : []);

      await api.put(`/apis/${id}`, {
        ...form,
        tags: tagsArray,
        expectedStatus: Number(form.expectedStatus),
        timeout: Number(form.timeout),
        interval: Number(form.interval),
        authentication: auth,
      });
      toast.success('API updated!');
      navigate(`/apis/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update API');
    } finally {
      setLoading(false);
    }
  };

  if (!form) {
    return (
      <div className="max-w-2xl mx-auto glass-card p-6 space-y-4">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><MdArrowBack size={18} /></button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Edit API</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.apiName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div>
          <SectionTitle>Basic Information</SectionTitle>
          <div className="space-y-4">
            <div>
              <label className="label">API Name *</label>
              <input type="text" name="apiName" value={form.apiName} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="label">API URL *</label>
              <input type="url" name="apiUrl" value={form.apiUrl} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" value={form.description || ''} onChange={handleChange} className="input-field resize-none" rows={2} />
            </div>
            <div>
              <label className="label">Tags (comma separated)</label>
              <input type="text" name="tags" value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')} onChange={handleChange} className="input-field" placeholder="Production, Auth, Payment" />
            </div>
          </div>
        </div>

        <Divider />

        {/* Maintenance Window (Feature 4) */}
        <div>
          <SectionTitle>🛑 Maintenance Window</SectionTitle>
          <div className="p-4 bg-white/3 rounded-xl space-y-3 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-200">Active Maintenance Window</p>
                <p className="text-xs text-slate-400">Pauses health checks & alert emails during scheduled downtime</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.maintenance?.active || false}
                  onChange={(e) => setForm(f => ({ ...f, maintenance: { ...(f.maintenance || {}), active: e.target.checked } }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-amber-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            {form.maintenance?.active && (
              <div>
                <label className="label text-xs">Reason / Details</label>
                <input
                  type="text"
                  placeholder="e.g. Database migration"
                  value={form.maintenance?.reason || ''}
                  onChange={(e) => setForm(f => ({ ...f, maintenance: { ...(f.maintenance || {}), reason: e.target.value } }))}
                  className="input-field text-xs"
                />
              </div>
            )}
          </div>
        </div>

        <Divider />

        {/* Authentication */}
        <div>
          <SectionTitle><MdLock size={12} style={{ display: 'inline', marginRight: 4 }} />Authentication</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Current auth: <strong style={{ color: '#6366f1' }}>{AUTH_LABELS[form.authentication?.type || 'none']}</strong>. Enter new credentials to update (leave blank to keep existing).
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {AUTH_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setAuth(a => ({ ...a, type: t }))}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: auth.type === t ? 'rgba(99,102,241,0.15)' : 'var(--bg-input)',
                  color: auth.type === t ? '#6366f1' : 'var(--text-muted)',
                  border: `1px solid ${auth.type === t ? 'rgba(99,102,241,0.4)' : 'var(--border-color)'}`,
                }}
              >
                {AUTH_LABELS[t]}
              </button>
            ))}
          </div>

          {auth.type === 'apiKey' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Header Name</label><input name="apiKeyHeader" value={auth.apiKeyHeader} onChange={handleAuthChange} className="input-field" /></div>
                <div><label className="label">Location</label>
                  <select name="apiKeyLocation" value={auth.apiKeyLocation} onChange={handleAuthChange} className="input-field">
                    <option value="header">Header</option><option value="query">Query Param</option>
                  </select>
                </div>
              </div>
              <div><label className="label">API Key (leave blank to keep existing)</label><input name="apiKey" value={auth.apiKey} onChange={handleAuthChange} className="input-field" type="password" /></div>
            </div>
          )}
          {auth.type === 'bearer' && (
            <div><label className="label">Bearer Token (leave blank to keep existing)</label><input name="bearerToken" value={auth.bearerToken} onChange={handleAuthChange} className="input-field" type="password" /></div>
          )}
          {auth.type === 'basic' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label"><MdPerson size={12} style={{ display: 'inline', marginRight: 4 }} />Username</label><input name="username" value={auth.username} onChange={handleAuthChange} className="input-field" /></div>
              <div><label className="label">Password</label><input name="password" value={auth.password} onChange={handleAuthChange} className="input-field" type="password" /></div>
            </div>
          )}
          {auth.type === 'custom' && (
            <div><label className="label">Custom Headers (JSON)</label><textarea name="customHeaders" value={auth.customHeaders} onChange={handleAuthChange} className="input-field resize-none" rows={3} style={{ fontFamily: 'monospace', fontSize: 12 }} /></div>
          )}
        </div>

        <Divider />

        <div>
          <SectionTitle>Monitoring Configuration</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">HTTP Method</label>
              <select name="method" value={form.method} onChange={handleChange} className="input-field">
                {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Status</label>
              <input type="number" name="expectedStatus" value={form.expectedStatus} onChange={handleChange} className="input-field" min={100} max={599} />
            </div>
            <div>
              <label className="label">Timeout (ms)</label>
              <input type="number" name="timeout" value={form.timeout} onChange={handleChange} className="input-field" min={1000} max={30000} step={500} />
            </div>
            <div>
              <label className="label">Check Interval</label>
              <select name="interval" value={form.interval} onChange={handleChange} className="input-field">
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <Divider />

        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Active Monitoring</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enable or disable monitoring for this API</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="active" checked={form.active} onChange={handleChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdSave /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
