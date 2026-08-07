import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdArrowBack, MdLock, MdKey, MdPerson } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const INTERVALS = [
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 },
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

export default function AddApiPage() {
  const [form, setForm] = useState({
    apiName: '', apiUrl: '', method: 'GET', expectedStatus: 200,
    timeout: 5000, interval: 5, description: '', active: true, requestBody: '',
  });
  const [auth, setAuth] = useState({
    type: 'none', apiKey: '', apiKeyHeader: 'X-API-Key', apiKeyLocation: 'header',
    bearerToken: '', username: '', password: '', customHeaders: '{}',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      await api.post('/apis', {
        ...form,
        expectedStatus: Number(form.expectedStatus),
        timeout: Number(form.timeout),
        interval: Number(form.interval),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        authentication: auth,
        requestBody: form.requestBody || null,
      });
      toast.success('API added successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><MdArrowBack size={18} /></button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Add New API</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Configure an endpoint to monitor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Basic Info */}
        <div>
          <SectionTitle>Basic Information</SectionTitle>
          <div className="space-y-4">
            <div>
              <label className="label">API Name *</label>
              <input id="api-name" type="text" name="apiName" value={form.apiName} onChange={handleChange} className="input-field" placeholder="My Production API" required />
            </div>
            <div>
              <label className="label">API URL *</label>
              <input id="api-url" type="url" name="apiUrl" value={form.apiUrl} onChange={handleChange} className="input-field" placeholder="https://api.example.com/health" required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="input-field resize-none" rows={2} placeholder="Optional description..." />
            </div>
            <div>
              <label className="label">Tags (comma separated)</label>
              <input type="text" name="tags" value={form.tags || ''} onChange={handleChange} className="input-field" placeholder="Production, Auth, Payment" />
            </div>
          </div>
        </div>

        <Divider />

        {/* Authentication */}
        <div>
          <SectionTitle><MdLock size={12} style={{ display: 'inline', marginRight: 4 }} />Authentication</SectionTitle>
          {/* Auth type selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {AUTH_TYPES.map(t => (
              <button
                key={t} type="button"
                onClick={() => setAuth(a => ({ ...a, type: t }))}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: auth.type === t ? 'rgba(99,102,241,0.15)' : 'var(--bg-input)',
                  color: auth.type === t ? '#6366f1' : 'var(--text-muted)',
                  border: `1px solid ${auth.type === t ? 'rgba(99,102,241,0.4)' : 'var(--border-color)'}`,
                  transition: 'all 0.2s',
                }}
              >
                {AUTH_LABELS[t]}
              </button>
            ))}
          </div>

          {auth.type === 'apiKey' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Header Name</label>
                  <input name="apiKeyHeader" value={auth.apiKeyHeader} onChange={handleAuthChange} className="input-field" placeholder="X-API-Key" />
                </div>
                <div>
                  <label className="label">Location</label>
                  <select name="apiKeyLocation" value={auth.apiKeyLocation} onChange={handleAuthChange} className="input-field">
                    <option value="header">Header</option>
                    <option value="query">Query Param</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">API Key Value *</label>
                <input name="apiKey" value={auth.apiKey} onChange={handleAuthChange} className="input-field" placeholder="your-api-key" type="password" />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔒 Your API key will be encrypted before storage.</p>
            </div>
          )}

          {auth.type === 'bearer' && (
            <div>
              <label className="label">Bearer Token *</label>
              <input name="bearerToken" value={auth.bearerToken} onChange={handleAuthChange} className="input-field" placeholder="eyJhbGci..." type="password" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>🔒 Token will be encrypted before storage.</p>
            </div>
          )}

          {auth.type === 'basic' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label"><MdPerson size={12} style={{ display: 'inline', marginRight: 4 }} />Username</label>
                <input name="username" value={auth.username} onChange={handleAuthChange} className="input-field" placeholder="username" />
              </div>
              <div>
                <label className="label">Password</label>
                <input name="password" value={auth.password} onChange={handleAuthChange} className="input-field" placeholder="password" type="password" />
              </div>
              <p style={{ gridColumn: '1/-1', fontSize: 11, color: 'var(--text-muted)' }}>🔒 Credentials will be encrypted before storage.</p>
            </div>
          )}

          {auth.type === 'custom' && (
            <div>
              <label className="label">Custom Headers (JSON)</label>
              <textarea name="customHeaders" value={auth.customHeaders} onChange={handleAuthChange} className="input-field resize-none" rows={3} placeholder={'{"Authorization": "Custom token123", "X-Custom": "value"}'} style={{ fontFamily: 'monospace', fontSize: 12 }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>🔒 Headers will be encrypted before storage.</p>
            </div>
          )}
        </div>

        <Divider />

        {/* Monitoring Config */}
        <div>
          <SectionTitle>Monitoring Configuration</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">HTTP Method</label>
              <select id="api-method" name="method" value={form.method} onChange={handleChange} className="input-field">
                {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Status Code</label>
              <input id="api-status" type="number" name="expectedStatus" value={form.expectedStatus} onChange={handleChange} className="input-field" min={100} max={599} />
            </div>
            <div>
              <label className="label">Timeout (ms)</label>
              <input id="api-timeout" type="number" name="timeout" value={form.timeout} onChange={handleChange} className="input-field" min={1000} max={30000} step={500} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>1000ms – 30000ms</p>
            </div>
            <div>
              <label className="label">Check Interval</label>
              <select id="api-interval" name="interval" value={form.interval} onChange={handleChange} className="input-field">
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
          </div>

          {/* Request body for POST/PUT/PATCH */}
          {['POST', 'PUT', 'PATCH'].includes(form.method) && (
            <div style={{ marginTop: 12 }}>
              <label className="label">Request Body (JSON)</label>
              <textarea name="requestBody" value={form.requestBody} onChange={handleChange} className="input-field resize-none" rows={3} placeholder={'{"key": "value"}'} style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </div>
          )}
        </div>

        <Divider />

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Active Monitoring</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start monitoring immediately after adding</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="active" checked={form.active} onChange={handleChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button id="add-api-submit" type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdAdd /> Add API</>}
          </button>
        </div>
      </form>
    </div>
  );
}
