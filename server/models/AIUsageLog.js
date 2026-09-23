const mongoose = require('mongoose');

/**
 * AIUsageLog model — stores per-check monitoring results for AI providers.
 * Normalized schema that works across OpenAI, Gemini, Anthropic, Groq, OpenRouter, and Generic providers.
 * Fields that a provider doesn't support are stored as null.
 */
const aiUsageLogSchema = new mongoose.Schema({
  aiProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIProvider',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Provider snapshot at check time
  provider: { type: String, required: true },   // e.g. 'openai', 'gemini'
  providerName: { type: String, default: null }, // display name
  model: { type: String, default: null },

  checkedAt: { type: Date, default: Date.now },

  // ── Health ──────────────────────────────────────────────────────────────
  statusCode: { type: Number, default: null },
  success: { type: Boolean, required: true },
  responseTime: { type: Number, default: null }, // ms
  timedOut: { type: Boolean, default: false },
  errorType: { type: String, default: null },    // e.g. 'RATE_LIMITED', 'INVALID_CREDENTIALS'
  errorMessage: { type: String, default: null },
  healthScore: { type: Number, default: null, min: 0, max: 100 },

  // ── Token Usage ──────────────────────────────────────────────────────────
  // Captured from response body when provider returns usage metadata
  inputTokens: { type: Number, default: null },
  outputTokens: { type: Number, default: null },
  totalTokens: { type: Number, default: null },
  cachedTokens: { type: Number, default: null },   // Gemini cached_content_token_count
  thinkingTokens: { type: Number, default: null }, // Gemini thoughts_token_count

  // ── Rate Limits ───────────────────────────────────────────────────────────
  // Parsed from response headers
  requestsLimit: { type: Number, default: null },
  requestsRemaining: { type: Number, default: null },
  requestsReset: { type: Date, default: null },
  tokensLimit: { type: Number, default: null },
  tokensRemaining: { type: Number, default: null },
  tokensReset: { type: Date, default: null },
  retryAfter: { type: Number, default: null }, // seconds

  // ── Cost ─────────────────────────────────────────────────────────────────
  // Only populated when the provider's official API reports cost
  cost: { type: Number, default: null },     // USD
  currency: { type: String, default: null }, // 'USD'
  // 'reported' = from official API, 'unavailable' = provider doesn't expose cost
  costSource: {
    type: String,
    enum: ['reported', 'unavailable', null],
    default: null,
  },

  // ── Metadata ─────────────────────────────────────────────────────────────
  responseSize: { type: Number, default: null }, // bytes
  // Safe response headers (Authorization and similar headers are stripped)
  selectedHeaders: {
    type: Map,
    of: String,
    default: {},
  },

}, { timestamps: false });

// Indexes for efficient queries
aiUsageLogSchema.index({ aiProviderId: 1, checkedAt: -1 });
aiUsageLogSchema.index({ userId: 1, checkedAt: -1 });
aiUsageLogSchema.index({ provider: 1, checkedAt: -1 });
aiUsageLogSchema.index({ model: 1 });
aiUsageLogSchema.index({ checkedAt: -1 });

module.exports = mongoose.model('AIUsageLog', aiUsageLogSchema);
