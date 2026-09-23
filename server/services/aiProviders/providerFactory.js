const openaiProvider = require('./openaiProvider');
const geminiProvider = require('./geminiProvider');
const anthropicProvider = require('./anthropicProvider');
const groqProvider = require('./groqProvider');
const openrouterProvider = require('./openrouterProvider');
const genericProvider = require('./genericProvider');

/**
 * Provider Factory
 *
 * Returns the appropriate provider adapter based on providerType.
 * Each adapter exposes at minimum: checkHealth(config)
 * Optional methods (where provider supports): getUsage(), getCosts()
 *
 * Provider interface (duck-typed):
 *   checkHealth({ apiKey, baseUrl, model, timeout, ...providerSpecific })
 *   getUsage({ adminKey, baseUrl, startTime, endTime })   — OpenAI only currently
 *   getCosts({ adminKey, baseUrl, startTime, endTime })   — OpenAI only currently
 */

const PROVIDER_MAP = {
  openai: openaiProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
  groq: groqProvider,
  openrouter: openrouterProvider,
  custom: genericProvider,
};

/**
 * Get provider adapter for a given AIProvider document.
 * @param {object} aiProviderDoc - AIProvider mongoose document (or plain object)
 * @returns {{ checkHealth, getUsage?, getCosts? }}
 */
const getProvider = (aiProviderDoc) => {
  const type = aiProviderDoc?.providerType || 'custom';
  return PROVIDER_MAP[type] || genericProvider;
};

/**
 * Get the default base URL for a provider type.
 * Used to pre-fill the form and as fallback in providers.
 */
const getDefaultBaseUrl = (providerType) => {
  const defaults = {
    openai: 'https://api.openai.com',
    gemini: 'https://generativelanguage.googleapis.com',
    anthropic: 'https://api.anthropic.com',
    groq: 'https://api.groq.com',
    openrouter: 'https://openrouter.ai',
    custom: '',
  };
  return defaults[providerType] || '';
};

/**
 * Get the default check strategy for a provider type.
 */
const getDefaultCheckStrategy = (providerType) => {
  const strategies = {
    openai: 'models_list',
    gemini: 'models_list',
    anthropic: 'minimal_request',
    groq: 'models_list',
    openrouter: 'models_list',
    custom: 'custom',
  };
  return strategies[providerType] || 'custom';
};

/**
 * Get supported features for a provider type.
 * Used to show/hide UI sections appropriately.
 */
const getProviderCapabilities = (providerType) => {
  const caps = {
    openai: {
      healthCheck: true,
      rateLimitHeaders: true,
      tokenUsageFromResponse: false, // health check uses /models, no usage returned
      orgUsageApi: true,  // requires admin key
      orgCostApi: true,   // requires admin key
      checkNote: 'Uses GET /v1/models — no tokens consumed',
    },
    gemini: {
      healthCheck: true,
      rateLimitHeaders: true,
      tokenUsageFromResponse: false, // health check uses /models list
      orgUsageApi: false,
      orgCostApi: false,
      checkNote: 'Uses GET /v1beta/models — no tokens consumed',
    },
    anthropic: {
      healthCheck: true,
      rateLimitHeaders: true,
      tokenUsageFromResponse: true, // minimal request returns usage
      orgUsageApi: false,
      orgCostApi: false,
      checkNote: 'Functional API Check — uses minimal POST /v1/messages (1 token). Anthropic has no dedicated health endpoint.',
    },
    groq: {
      healthCheck: true,
      rateLimitHeaders: true,
      tokenUsageFromResponse: false,
      orgUsageApi: false,
      orgCostApi: false,
      checkNote: 'Uses GET /openai/v1/models — no tokens consumed',
    },
    openrouter: {
      healthCheck: true,
      rateLimitHeaders: true,
      tokenUsageFromResponse: false,
      orgUsageApi: false,
      orgCostApi: false,
      checkNote: 'Uses GET /api/v1/models — no tokens consumed',
    },
    custom: {
      healthCheck: true,
      rateLimitHeaders: true,
      tokenUsageFromResponse: false,
      orgUsageApi: false,
      orgCostApi: false,
      checkNote: 'User-defined endpoint and method',
    },
  };
  return caps[providerType] || caps.custom;
};

module.exports = { getProvider, getDefaultBaseUrl, getDefaultCheckStrategy, getProviderCapabilities };
