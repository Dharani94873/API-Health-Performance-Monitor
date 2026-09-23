const axios = require('axios');

/**
 * OpenRouter Provider Adapter
 *
 * Health Check Strategy:
 *   - GET /api/v1/models — lightweight model list, no tokens consumed
 *   - Labeled: "Models List Check"
 *   - Note: OpenRouter uses OpenAI-compatible API format
 *
 * Rate Limits:
 *   - OpenRouter may return rate limit information via standard x-ratelimit-* headers
 *   - Also exposes X-RateLimit-* headers
 *
 * Usage:
 *   - Per-request usage returned in completion response bodies
 *   - No public org-level billing/usage API available
 *
 * Note: Although OpenRouter is OpenAI-compatible, it is kept as a separate
 * adapter to allow provider-specific handling in the future.
 */

const DEFAULT_BASE_URL = 'https://openrouter.ai';

/**
 * Parse OpenRouter rate limit headers
 */
const parseOpenRouterRateLimits = (headers) => {
  const h = headers || {};
  const parseNum = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
  const parseReset = (v) => {
    if (!v) return null;
    return isNaN(Number(v)) ? new Date(v) : new Date(Number(v) * 1000);
  };

  return {
    requestsLimit: parseNum(
      h['x-ratelimit-limit-requests'] || h['x-ratelimit-limit'] || h['X-RateLimit-Limit']
    ),
    requestsRemaining: parseNum(
      h['x-ratelimit-remaining-requests'] || h['x-ratelimit-remaining'] || h['X-RateLimit-Remaining']
    ),
    requestsReset: parseReset(
      h['x-ratelimit-reset-requests'] || h['x-ratelimit-reset'] || h['X-RateLimit-Reset']
    ),
    tokensLimit: parseNum(h['x-ratelimit-limit-tokens']),
    tokensRemaining: parseNum(h['x-ratelimit-remaining-tokens']),
    tokensReset: parseReset(h['x-ratelimit-reset-tokens']),
    retryAfter: parseNum(h['retry-after']),
  };
};

/**
 * Parse OpenRouter usage from response body (OpenAI-compatible format)
 */
const parseOpenRouterUsage = (responseData) => {
  const usage = responseData?.usage;
  if (!usage) return {};
  return {
    inputTokens: usage.prompt_tokens ?? null,
    outputTokens: usage.completion_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
  };
};

/**
 * Perform the health check.
 * Uses GET /api/v1/models — lightweight, no tokens consumed.
 */
const checkHealth = async ({ apiKey, baseUrl, timeout }) => {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${base}/api/v1/models`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://api-health-monitor.app', // OpenRouter recommends this
        'X-Title': 'API Health Monitor',
      },
      timeout: timeout || 10000,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const headers = response.headers || {};
    const rateLimits = parseOpenRouterRateLimits(headers);

    const bodyStr = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data || '');
    const responseSize = Buffer.byteLength(bodyStr, 'utf8');

    const safeHeaders = {};
    const allowedHeaders = [
      'content-type', 'x-request-id',
      'x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests',
      'x-ratelimit-reset-requests', 'x-ratelimit-limit-tokens',
      'x-ratelimit-remaining-tokens', 'x-ratelimit-reset-tokens',
      'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset',
      'retry-after',
    ];
    for (const key of allowedHeaders) {
      if (headers[key]) safeHeaders[key] = String(headers[key]);
    }

    const success = response.status === 200;
    let errorType = null;
    let errorMessage = null;

    if (response.status === 401 || response.status === 403) {
      errorType = 'INVALID_CREDENTIALS';
      errorMessage = 'Invalid API key or unauthorized';
    } else if (response.status === 429) {
      errorType = 'RATE_LIMITED';
      errorMessage = 'Rate limit exceeded';
    } else if (!success) {
      errorType = 'PROVIDER_ERROR';
      errorMessage = `HTTP ${response.status}`;
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
      checkStrategy: 'models_list',
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
      checkStrategy: 'models_list',
    };
  }
};

module.exports = { checkHealth, parseOpenRouterRateLimits, parseOpenRouterUsage };
