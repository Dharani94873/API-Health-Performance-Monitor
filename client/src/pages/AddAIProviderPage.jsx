import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSmartToy, MdArrowBack, MdSave, MdInfo } from 'react-icons/md';
import api from '../services/api';
import toast from 'react-hot-toast';

const PROVIDER_DEFAULTS = {
  openai: {
    baseUrl: 'https://api.openai.com',
    authType: 'bearer',
    authHeaderName: 'Authorization',
    checkStrategy: 'models_list',
    checkNote: 'Uses GET /v1/models — no tokens consumed.',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    authType: 'query_param',
    authHeaderName: 'key',
    checkStrategy: 'models_list',
    checkNote: 'Uses GET /v1beta/models — no tokens consumed.',
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    authType: 'api_key_header',
    authHeaderName: 'x-api-key',
    checkStrategy: 'minimal_request',
    checkNote: 'Functional API Check — uses minimal POST /v1/messages (1 token). Anthropic has no dedicated health endpoint.',
  },
  groq: {
    baseUrl: 'https://api.groq.com',
    authType: 'bearer',
    authHeaderName: 'Authorization',
    checkStrategy: 'models_list',
    checkNote: 'Uses GET /openai/v1/models — no tokens consumed.',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai',
    authType: 'bearer',
    authHeaderName: 'Authorization',
    checkStrategy: 'models_list',
    checkNote: 'Uses GET /api/v1/models — no tokens consumed.',
  },
  custom: {
    baseUrl: '',
    authType: 'bearer',
    authHeaderName: 'Authorization',
    checkStrategy: 'custom',
    checkNote: 'User-defined endpoint and method.',
  },
};

const FormSection = ({ title, children }) => (
  <div className="glass-card p-5 space-y-4">
    <h3 className="font-semibold text-white border-b border-white/10 pb-3">{title}</h3>
    {children}
  </div>
);

const FormField = ({ label, hint, children, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);

const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-colors";
const selectClass = inputClass;

export default function AddAIProviderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    providerName: '',
    providerType: 'openai',
    description: '',
    baseUrl: PROVIDER_DEFAULTS.openai.baseUrl,
    model: '',
    authType: PROVIDER_DEFAULTS.openai.authType,
    authHeaderName: PROVIDER_DEFAULTS.openai.authHeaderName,
    apiKey: '',
    adminKey: '',
    organizationId: '',
    projectId: '',
    monitoringEnabled: true,
    interval: 5,
    timeout: 10000,
    expectedStatus: 200,
    checkStrategy: PROVIDER_DEFAULTS.openai.checkStrategy,
    customCheckUrl: '',
    customCheckMethod: 'GET',
    customCheckBody: '',
    monthlyBudget: '',
    alertThreshold: '',
    latencyAlertMs: 5000,
    availabilityAlertPct: 95,
  });

  const handleProviderTypeChange = (type) => {
    const defaults = PROVIDER_DEFAULTS[type] || PROVIDER_DEFAULTS.custom;
    setForm(prev => ({
      ...prev,
      providerType: type,
      baseUrl: defaults.baseUrl,
      authType: defaults.authType,
      authHeaderName: defaults.authHeaderName,
      checkStrategy: defaults.checkStrategy,
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.providerName.trim()) return toast.error('Provider name is required');
    if (!form.apiKey.trim()) return toast.error('API key is required');

    setLoading(true);
    try {
      const payload = {
        ...form,
        interval: Number(form.interval),
        timeout: Number(form.timeout),
        expectedStatus: Number(form.expectedStatus),
        latencyAlertMs: Number(form.latencyAlertMs),
        availabilityAlertPct: Number(form.availabilityAlertPct),
        monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : null,
        alertThreshold: form.alertThreshold ? Number(form.alertThreshold) : null,
        adminKey: form.adminKey.trim() || undefined,
        customCheckUrl: form.customCheckUrl.trim() || undefined,
        customCheckBody: form.customCheckBody.trim() || undefined,
      };

      await api.post('/ai-providers', payload);
      toast.success('AI Provider added successfully');
      navigate('/ai-providers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add provider');
    } finally {
      setLoading(false);
    }
  };

  const currentNote = PROVIDER_DEFAULTS[form.providerType]?.checkNote;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/ai-providers')} className="btn-secondary">
          <MdArrowBack size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MdSmartToy className="text-violet-400" /> Add AI Provider
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure a new AI/LLM provider for monitoring</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic Info */}
        <FormSection title="Provider Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Provider Name" required>
              <input name="providerName" value={form.providerName} onChange={handleChange}
                className={inputClass} placeholder="e.g. OpenAI Production" />
            </FormField>
            <FormField label="Provider Type" required>
              <select name="providerType" value={form.providerType}
                onChange={e => handleProviderTypeChange(e.target.value)} className={selectClass}>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="anthropic">Anthropic</option>
                <option value="groq">Groq</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom / Generic</option>
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Model" hint="Optional — e.g. gpt-4o, gemini-1.5-pro">
              <input name="model" value={form.model} onChange={handleChange}
                className={inputClass} placeholder="e.g. gpt-4o" />
            </FormField>
            <FormField label="Description">
              <input name="description" value={form.description} onChange={handleChange}
                className={inputClass} placeholder="Optional description" />
            </FormField>
          </div>
          <FormField label="Base URL" hint="Leave empty to use the provider default">
            <input name="baseUrl" value={form.baseUrl} onChange={handleChange}
              className={inputClass} placeholder="https://api.openai.com" />
          </FormField>

          {currentNote && (
            <div className="flex items-start gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-sm text-violet-300">
              <MdInfo className="flex-shrink-0 mt-0.5" size={16} />
              <span>{currentNote}</span>
            </div>
          )}
        </FormSection>

        {/* Authentication */}
        <FormSection title="Authentication">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
            🔐 Credentials are sent only to the secure backend. They are encrypted with AES-256-GCM before storage and never returned to the browser.
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
            <FormField label="Header / Param Name" hint={`e.g. Authorization, x-api-key, key`}>
              <input name="authHeaderName" value={form.authHeaderName} onChange={handleChange}
                className={inputClass} />
            </FormField>
          </div>
          <FormField label="API Key" required hint="Stored AES-256-GCM encrypted. Never visible after saving.">
            <input name="apiKey" value={form.apiKey} onChange={handleChange} type="password"
              className={inputClass} placeholder="sk-... or your API key" autoComplete="new-password" />
          </FormField>
          {form.providerType === 'openai' && (
            <FormField label="Admin Key (Optional)" hint="Required for OpenAI Organization Usage & Costs API. Stored encrypted.">
              <input name="adminKey" value={form.adminKey} onChange={handleChange} type="password"
                className={inputClass} placeholder="sk-admin-... (OpenAI Admin Key)" autoComplete="new-password" />
            </FormField>
          )}
        </FormSection>

        {/* Optional IDs */}
        <FormSection title="Organization / Project (Optional)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Organization ID">
              <input name="organizationId" value={form.organizationId} onChange={handleChange}
                className={inputClass} placeholder="org-..." />
            </FormField>
            <FormField label="Project ID">
              <input name="projectId" value={form.projectId} onChange={handleChange}
                className={inputClass} placeholder="proj-..." />
            </FormField>
          </div>
        </FormSection>

        {/* Monitoring Config */}
        <FormSection title="Monitoring Configuration">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="monitoringEnabled" name="monitoringEnabled"
              checked={form.monitoringEnabled} onChange={handleChange}
              className="w-4 h-4 accent-violet-500" />
            <label htmlFor="monitoringEnabled" className="text-sm text-slate-300">Enable scheduled monitoring</label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Interval (min)" hint="1–1440">
              <input name="interval" type="number" value={form.interval} onChange={handleChange}
                min={1} max={1440} className={inputClass} />
            </FormField>
            <FormField label="Timeout (ms)" hint="1000–60000">
              <input name="timeout" type="number" value={form.timeout} onChange={handleChange}
                min={1000} max={60000} className={inputClass} />
            </FormField>
            <FormField label="Expected Status">
              <input name="expectedStatus" type="number" value={form.expectedStatus} onChange={handleChange}
                className={inputClass} />
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
            <div className="space-y-3 border-t border-white/10 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Custom URL" hint="Full URL to check">
                  <input name="customCheckUrl" value={form.customCheckUrl} onChange={handleChange}
                    className={inputClass} placeholder="https://..." />
                </FormField>
                <FormField label="Method">
                  <select name="customCheckMethod" value={form.customCheckMethod} onChange={handleChange} className={selectClass}>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </FormField>
                <FormField label="Request Body (JSON)" hint="Optional, for POST">
                  <input name="customCheckBody" value={form.customCheckBody} onChange={handleChange}
                    className={inputClass} placeholder='{"key": "value"}' />
                </FormField>
              </div>
            </div>
          )}
        </FormSection>

        {/* Alert Thresholds */}
        <FormSection title="Alert Thresholds">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="Monthly Budget (USD)">
              <input name="monthlyBudget" type="number" value={form.monthlyBudget} onChange={handleChange}
                className={inputClass} placeholder="e.g. 100" step="0.01" />
            </FormField>
            <FormField label="Budget Alert (%)" hint="Alert when % of budget is used">
              <input name="alertThreshold" type="number" value={form.alertThreshold} onChange={handleChange}
                min={0} max={100} className={inputClass} placeholder="e.g. 80" />
            </FormField>
            <FormField label="Latency Alert (ms)">
              <input name="latencyAlertMs" type="number" value={form.latencyAlertMs} onChange={handleChange}
                className={inputClass} placeholder="5000" />
            </FormField>
            <FormField label="Min Availability (%)" hint="Alert if drops below">
              <input name="availabilityAlertPct" type="number" value={form.availabilityAlertPct} onChange={handleChange}
                min={0} max={100} className={inputClass} placeholder="95" />
            </FormField>
          </div>
        </FormSection>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            <MdSave size={18} />
            {loading ? 'Adding…' : 'Add AI Provider'}
          </button>
          <button type="button" onClick={() => navigate('/ai-providers')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
