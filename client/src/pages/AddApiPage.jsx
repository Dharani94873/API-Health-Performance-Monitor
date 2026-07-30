import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdArrowBack } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function AddApiPage() {
  const [form, setForm] = useState({
    apiName: '',
    apiUrl: '',
    method: 'GET',
    expectedStatus: 200,
    timeout: 5000,
    interval: 5,
    description: '',
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <MdArrowBack size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Add New API</h1>
          <p className="text-slate-500 text-sm">Configure an endpoint to monitor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Basic Information</h3>
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
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Monitoring Config */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Monitoring Configuration</h3>
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
              <p className="text-xs text-slate-600 mt-1">1000ms – 30000ms</p>
            </div>
            <div>
              <label className="label">Check Interval (minutes)</label>
              <input id="api-interval" type="number" name="interval" value={form.interval} onChange={handleChange} className="input-field" min={1} max={60} />
              <p className="text-xs text-slate-600 mt-1">1 – 60 minutes</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Active Monitoring</p>
            <p className="text-xs text-slate-500">Start monitoring immediately after adding</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="active" checked={form.active} onChange={handleChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button id="add-api-submit" type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : <><MdAdd /> Add API</>}
          </button>
        </div>
      </form>
    </div>
  );
}
