const mongoose = require('mongoose');

/**
 * AIProvider model — stores per-user AI provider configurations.
 * Sensitive credentials (API key, admin key) are stored AES-256-GCM encrypted.
 * Raw keys are NEVER stored in plaintext.
 */
const aiProviderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Display / identity
  providerName: {
    type: String,
    required: [true, 'Provider name is required'],
    trim: true,
    maxlength: [100, 'Provider name cannot exceed 100 characters'],
  },
  providerType: {
    type: String,
    enum: ['openai', 'gemini', 'anthropic', 'groq', 'openrouter', 'custom'],
    required: [true, 'Provider type is required'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },

  // Connection
  baseUrl: {
    type: String,
    trim: true,
    default: null, // null = use provider default
  },
  model: {
    type: String,
    trim: true,
    default: null,
  },

  // Authentication
  authType: {
    type: String,
    enum: ['bearer', 'api_key_header', 'query_param', 'custom_header'],
    default: 'bearer',
  },
  authHeaderName: {
    type: String,
    default: 'Authorization', // e.g. "x-api-key" for Anthropic, "Authorization" for others
  },
  encryptedApiKey: {
    type: String,
    default: null,
  },
  // Admin/usage key — only for providers that have separate admin keys (e.g. OpenAI)
  encryptedAdminKey: {
    type: String,
    default: null,
  },

  // Optional org/project identifiers (non-sensitive)
  organizationId: { type: String, default: null, trim: true },
  projectId: { type: String, default: null, trim: true },

  // Monitoring configuration
  monitoringEnabled: { type: Boolean, default: true },
  interval: {
    type: Number,
    default: 5,
    min: [1, 'Interval must be at least 1 minute'],
    max: [1440, 'Interval cannot exceed 24 hours'],
  },
  timeout: {
    type: Number,
    default: 10000,
    min: [1000, 'Timeout must be at least 1 second'],
    max: [60000, 'Timeout cannot exceed 60 seconds'],
  },
  expectedStatus: { type: Number, default: 200 },

  // Check strategy
  // 'models_list'     = GET /models endpoint (lightweight, no tokens consumed)
  // 'minimal_request' = Minimal valid API request (may consume minimal tokens)
  // 'custom'          = User-defined endpoint/body
  checkStrategy: {
    type: String,
    enum: ['models_list', 'minimal_request', 'custom'],
    default: 'models_list',
  },
  customCheckUrl: { type: String, default: null },
  customCheckMethod: {
    type: String,
    enum: ['GET', 'POST', 'HEAD'],
    default: 'GET',
  },
  customCheckBody: { type: String, default: null }, // JSON string

  // Thresholds for alerts
  monthlyBudget: { type: Number, default: null },       // USD
  alertThreshold: { type: Number, default: null },      // % of budget to trigger alert
  latencyAlertMs: { type: Number, default: 5000 },      // ms — alert if latency exceeds
  availabilityAlertPct: { type: Number, default: 95 },  // % — alert if availability drops below

  // Current status (updated on each check)
  lastCheckAt: { type: Date, default: null },
  lastStatus: {
    type: String,
    enum: ['healthy', 'degraded', 'down', 'unknown'],
    default: 'unknown',
  },
  healthScore: { type: Number, default: null, min: 0, max: 100 },
  healthGrade: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'Poor', null],
    default: null,
  },
  uptimePercentage: { type: Number, default: 0, min: 0, max: 100 },

  // Cached rate limit info (updated on each check)
  lastRequestsLimit: { type: Number, default: null },
  lastRequestsRemaining: { type: Number, default: null },
  lastTokensLimit: { type: Number, default: null },
  lastTokensRemaining: { type: Number, default: null },

}, { timestamps: true });

// Indexes
aiProviderSchema.index({ userId: 1, createdAt: -1 });
aiProviderSchema.index({ userId: 1, providerType: 1 });
aiProviderSchema.index({ monitoringEnabled: 1 });
aiProviderSchema.index({ lastStatus: 1 });

module.exports = mongoose.model('AIProvider', aiProviderSchema);
