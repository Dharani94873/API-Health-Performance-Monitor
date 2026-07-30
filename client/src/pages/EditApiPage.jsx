import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdSave, MdArrowBack } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function EditApiPage() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApi = async () => {
      try {
        const { data } = await api.get(`/apis/${id}`);
        setForm(data.api);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/apis/${id}`, {
        ...form,
        expectedStatus: Number(form.expectedStatus),
        timeout: Number(form.timeout),
        interval: Number(form.interval),
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
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <MdArrowBack size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit API</h1>
          <p className="text-slate-500 text-sm">{form.apiName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Basic Information</h3>
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
          </div>
        </div>

        <div className="border-t border-white/5" />

        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Monitoring Configuration</h3>
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
              <label className="label">Check Interval (min)</label>
              <input type="number" name="interval" value={form.interval} onChange={handleChange} className="input-field" min={1} max={60} />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Active Monitoring</p>
            <p className="text-xs text-slate-500">Enable or disable monitoring for this API</p>
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
