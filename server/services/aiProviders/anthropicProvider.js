const axios = require('axios');

/**
 * Anthropic Provider Adapter
 *
 * Health Check Strategy:
 *   - Anthropic does NOT have a dedicated /health or /models GET endpoint
 *     that works without tokens.
 *   - Strategy: POST /v1/messages with the minimum valid payload
 *     (max_tokens=1, a trivial prompt). This consumes minimal tokens (~1-3).
 *   - Labeled: "Functional API Check (Minimal Request)"
 *
 * Token Usage:
 *   - Returned in response body `usage` field: { input_tokens, output_tokens }
 *
 * Rate Limit Headers:
 *   - anthropic-ratelimit-requests-limit
 *   - anthropic-ratelimit-requests-remaining
 *   - anthropic-ratelimit-requests-reset
 *   - anthropic-ratelimit-tokens-limit
 *   - anthropic-ratelimit-tokens-remaining
 *   - anthropic-ratelimit-tokens-reset
 *   - retry-after
 *
 * Organization Usage API:
 *   - Anthropic does NOT publicly expose an organization-level usage/billing API
 *   - Only per-response token counts are captured
 */

const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';
// Default model for minimal health check — choose a small, cheap model
const DEFAULT_HEALTH_MODEL = 'claude-haiku-4-5';

/**
 * Parse Anthropic-specific rate limit headers
 */
const parseAnthropicRateLimits = (headers) => {
  const h = headers || {};
  const parseNum = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
  const parseReset = (v) => {
    if (!v) return null;
    return isNaN(Number(v)) ? new Date(v) : new Date(Number(v) * 1000);
  };

  return {
    requestsLimit: parseNum(h['anthropic-ratelimit-requests-limit']),
    requestsRemaining: parseNum(h['anthropic-ratelimit-requests-remaining']),
    requestsReset: parseReset(h['anthropic-ratelimit-requests-reset']),
    tokensLimit: parseNum(h['anthropic-ratelimit-tokens-limit']),
    tokensRemaining: parseNum(h['anthropic-ratelimit-tokens-remaining']),
    tokensReset: parseReset(h['anthropic-ratelimit-tokens-reset']),
    retryAfter: parseNum(h['retry-after']),
  };
};

/**
 * Parse Anthropic token usage from response body
 */
const parseAnthropicUsage = (responseData) => {
  const usage = responseData?.usage;
  if (!usage) return {};
  return {
    inputTokens: usage.input_tokens ?? null,
    outputTokens: usage.output_tokens ?? null,
    totalTokens: (usage.input_tokens != null && usage.output_tokens != null)
      ? usage.input_tokens + usage.output_tokens
      : null,
    cachedTokens: usage.cache_read_input_tokens ?? null,
  };
};

/**
 * Perform the health check.
 * Uses POST /v1/messages with a minimal valid payload.
 * NOTE: This consumes a small number of tokens (~1-3) per check.
 * The response is evaluated for success; the actual content is discarded.
 */
const checkHealth = async ({ apiKey, baseUrl, model, timeout }) => {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${base}/v1/messages`;
  const checkModel = model || DEFAULT_HEALTH_MODEL;
  const startTime = Date.now();

  const requestBody = {
    model: checkModel,
    max_tokens: 1,
    messages: [{ role: 'user', content: 'Hi' }],
  };

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      timeout: timeout || 15000,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const headers = response.headers || {};
    const rateLimits = parseAnthropicRateLimits(headers);
    const tokenUsage = parseAnthropicUsage(response.data);

    const bodyStr = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data || '');
    const responseSize = Buffer.byteLength(bodyStr, 'utf8');

    const safeHeaders = {};
    const allowedHeaders = [
      'content-type', 'request-id',
      'anthropic-ratelimit-requests-limit', 'anthropic-ratelimit-requests-remaining',
      'anthropic-ratelimit-requests-reset', 'anthropic-ratelimit-tokens-limit',
      'anthropic-ratelimit-tokens-remaining', 'anthropic-ratelimit-tokens-reset',
      'retry-after',
    ];
    for (const key of allowedHeaders) {
      if (headers[key]) safeHeaders[key] = String(headers[key]);
    }

    const success = response.status === 200;
    let errorType = null;
    let errorMessage = null;

    if (response.status === 401) {
      errorType = 'INVALID_CREDENTIALS';
      errorMessage = 'Invalid API key';
    } else if (response.status === 403) {
      errorType = 'PERMISSION_DENIED';
      errorMessage = 'Permission denied';
    } else if (response.status === 429) {
      errorType = 'RATE_LIMITED';
      errorMessage = response.data?.error?.message || 'Rate limit exceeded';
    } else if (response.status === 529) {
      errorType = 'PROVIDER_UNAVAILABLE';
      errorMessage = 'Anthropic API overloaded';
    } else if (!success) {
      errorType = 'PROVIDER_ERROR';
      errorMessage = response.data?.error?.message || `HTTP ${response.status}`;
    }

    return {
      success,
      statusCode: response.status,
      responseTime,
      responseSize,
      rateLimits,
      safeHeaders,
      errorType,
      errorMessage,
      tokenUsage,
      checkStrategy: 'minimal_request',
      checkNote: 'Functional API Check — Anthropic does not provide a dedicated health endpoint. Uses minimal POST /v1/messages (1 token).',
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const timedOut = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
    return {
      success: false,
      statusCode: err.response?.status || null,
      responseTime,
      timedOut,
      errorType: timedOut ? 'REQUEST_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
      errorMessage: err.message,
      rateLimits: {},
      safeHeaders: {},
      tokenUsage: {},
      checkStrategy: 'minimal_request',
    };
  }
};

module.exports = { checkHealth, parseAnthropicRateLimits, parseAnthropicUsage };
