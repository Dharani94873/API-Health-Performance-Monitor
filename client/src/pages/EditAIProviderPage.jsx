import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdSmartToy, MdArrowBack, MdSave } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';

const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-colors";
const selectClass = inputClass;

const FormSection = ({ title, children }) => (
  <div className="glass-card p-5 space-y-4">
    <h3 className="font-semibold text-white border-b border-white/10 pb-3">{title}</h3>
    {children}
  </div>
);

const FormField = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);

export default function EditAIProviderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState(null);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await api.get(`/ai-providers/${id}`);
        const p = res.data.aiProvider;
        setForm({
          providerName: p.providerName || '',
          description: p.description || '',
          baseUrl: p.baseUrl || '',
          model: p.model || '',
          authType: p.authType || 'bearer',
          authHeaderName: p.authHeaderName || 'Authorization',
          organizationId: p.organizationId || '',
          projectId: p.projectId || '',
          monitoringEnabled: p.monitoringEnabled !== false,
          interval: p.interval || 5,
          timeout: p.timeout || 10000,
          expectedStatus: p.expectedStatus || 200,
          checkStrategy: p.checkStrategy || 'models_list',
          customCheckUrl: p.customCheckUrl || '',
          customCheckMethod: p.customCheckMethod || 'GET',
          customCheckBody: p.customCheckBody || '',
          monthlyBudget: p.monthlyBudget || '',
          alertThreshold: p.alertThreshold || '',
          latencyAlertMs: p.latencyAlertMs || 5000,
          availabilityAlertPct: p.availabilityAlertPct || 95,
          providerType: p.providerType,
          hasApiKey: p.hasApiKey,
          hasAdminKey: p.hasAdminKey,
          // Don't pre-fill API keys — they must be re-entered only if changing
          apiKey: '',
          adminKey: '',
        });
      } catch {
        toast.error('Failed to load provider');
        navigate('/ai-providers');
      } finally {
        setFetching(false);
      }
    };
    fetchProvider();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.providerName.trim()) return toast.error('Provider name is required');
    setLoading(true);
    try {
      const payload = {
        providerName: form.providerName,
        description: form.description,
        baseUrl: form.baseUrl || null,
        model: form.model || null,
        authType: form.authType,
        authHeaderName: form.authHeaderName,
        organizationId: form.organizationId || null,
        projectId: form.projectId || null,
        monitoringEnabled: form.monitoringEnabled,
        interval: Number(form.interval),
        timeout: Number(form.timeout),
        expectedStatus: Number(form.expectedStatus),
        checkStrategy: form.checkStrategy,
        customCheckUrl: form.customCheckUrl || null,
        customCheckMethod: form.customCheckMethod,
        customCheckBody: form.customCheckBody || null,
        monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : null,
        alertThreshold: form.alertThreshold ? Number(form.alertThreshold) : null,
        latencyAlertMs: Number(form.latencyAlertMs),
        availabilityAlertPct: Number(form.availabilityAlertPct),
      };
      // Only include keys if the user typed something (re-encrypt only if changed)
      if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();
      if (form.adminKey.trim()) payload.adminKey = form.adminKey.trim();

      await api.put(`/ai-providers/${id}`, payload);
      toast.success('AI Provider updated');
      navigate(`/ai-providers/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update provider');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/ai-providers/${id}`)} className="btn-secondary">
          <MdArrowBack size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdSmartToy className="text-violet-400" /> Edit AI Provider
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{form.providerName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        <FormSection title="Provider Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Provider Name">
              <input name="providerName" value={form.providerName} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Model">
              <input name="model" value={form.model} onChange={handleChange} className={inputClass} placeholder="e.g. gpt-4o" />
            </FormField>
          </div>
          <FormField label="Description">
            <input name="description" value={form.description} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Base URL">
            <input name="baseUrl" value={form.baseUrl} onChange={handleChange} className={inputClass} />
          </FormField>
        </FormSection>

        <FormSection title="Authentication">
          <div className="bg-slate-800/60 border border-white/5 rounded-lg p-3 text-xs text-slate-400">
            🔒 Existing credentials are stored encrypted and are not shown. Leave the fields below blank to keep existing keys, or enter new values to replace them.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Auth Type">
              <select name="authType" value={form.authType} onChange={handleChange} className={selectClass}>
                <option value="bearer">Bearer Token</option>
                <option value="api_key_header">API Key Header</option>
                <option value="query_param">Query Parameter</option>
                <option value="custom_header">Custom Header</option>
              </select>
            </FormField>
            <FormField label="Header / Param Name">
              <input name="authHeaderName" value={form.authHeaderName} onChange={handleChange} className={inputClass} />
            </FormField>
          </div>
          <FormField label="New API Key" hint={form.hasApiKey ? '✓ Key is configured. Enter new value to replace, leave blank to keep.' : 'No key configured. Enter to set.'}>
            <input name="apiKey" type="password" value={form.apiKey} onChange={handleChange}
              className={inputClass} placeholder="Leave blank to keep existing key" autoComplete="new-password" />
          </FormField>
          {form.providerType === 'openai' && (
            <FormField label="New Admin Key (Optional)" hint={form.hasAdminKey ? '✓ Admin key configured. Enter new value to replace.' : 'Not configured.'}>
              <input name="adminKey" type="password" value={form.adminKey} onChange={handleChange}
                className={inputClass} placeholder="Leave blank to keep existing admin key" autoComplete="new-password" />
            </FormField>
          )}
        </FormSection>

        <FormSection title="Organization / Project">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Organization ID">
              <input name="organizationId" value={form.organizationId} onChange={handleChange} className={inputClass} placeholder="org-..." />
            </FormField>
            <FormField label="Project ID">
              <input name="projectId" value={form.projectId} onChange={handleChange} className={inputClass} placeholder="proj-..." />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Monitoring Configuration">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="monitoringEnabled" name="monitoringEnabled"
              checked={form.monitoringEnabled} onChange={handleChange} className="w-4 h-4 accent-violet-500" />
            <label htmlFor="monitoringEnabled" className="text-sm text-slate-300">Enable scheduled monitoring</label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Interval (min)">
              <input name="interval" type="number" value={form.interval} onChange={handleChange} min={1} max={1440} className={inputClass} />
            </FormField>
            <FormField label="Timeout (ms)">
              <input name="timeout" type="number" value={form.timeout} onChange={handleChange} min={1000} max={60000} className={inputClass} />
            </FormField>
            <FormField label="Expected Status">
              <input name="expectedStatus" type="number" value={form.expectedStatus} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Check Strategy">
              <select name="checkStrategy" value={form.checkStrategy} onChange={handleChange} className={selectClass}>
                <option value="models_list">Models List (Lightweight)</option>
                <option value="minimal_request">Minimal Request</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </FormField>
          </div>
          {form.checkStrategy === 'custom' && (
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
              <FormField label="Custom URL">
                <input name="customCheckUrl" value={form.customCheckUrl} onChange={handleChange} className={inputClass} placeholder="https://..." />
              </FormField>
              <FormField label="Method">
                <select name="customCheckMethod" value={form.customCheckMethod} onChange={handleChange} className={selectClass}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </FormField>
              <FormField label="Request Body (JSON)">
                <input name="customCheckBody" value={form.customCheckBody} onChange={handleChange} className={inputClass} placeholder='{"key": "value"}' />
              </FormField>
            </div>
          )}
        </FormSection>

        <FormSection title="Alert Thresholds">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Monthly Budget (USD)">
              <input name="monthlyBudget" type="number" value={form.monthlyBudget} onChange={handleChange} className={inputClass} step="0.01" />
            </FormField>
            <FormField label="Budget Alert (%)">
              <input name="alertThreshold" type="number" value={form.alertThreshold} onChange={handleChange} min={0} max={100} className={inputClass} />
            </FormField>
            <FormField label="Latency Alert (ms)">
              <input name="latencyAlertMs" type="number" value={form.latencyAlertMs} onChange={handleChange} className={inputClass} />
            </FormField>
            <FormField label="Min Availability (%)">
              <input name="availabilityAlertPct" type="number" value={form.availabilityAlertPct} onChange={handleChange} min={0} max={100} className={inputClass} />
            </FormField>
          </div>
        </FormSection>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            <MdSave size={18} />
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/ai-providers/${id}`)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
