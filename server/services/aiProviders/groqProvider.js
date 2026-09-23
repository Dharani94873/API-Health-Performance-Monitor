const axios = require('axios');

/**
 * Groq Provider Adapter
 *
 * Health Check Strategy:
 *   - GET /openai/v1/models — OpenAI-compatible endpoint, lightweight, no tokens consumed
 *   - Labeled: "Models List Check"
 *
 * Rate Limit Headers (Groq documents these):
 *   x-ratelimit-limit-requests
 *   x-ratelimit-remaining-requests
 *   x-ratelimit-reset-requests
 *   x-ratelimit-limit-tokens
 *   x-ratelimit-remaining-tokens
 *   x-ratelimit-reset-tokens
 *   retry-after
 *
 * Token Usage:
 *   - Returned in response body for completion endpoints (if used)
 *   - Not returned by the models list endpoint — will be null for health checks
 *
 * Organization Usage API:
 *   - Groq does not publicly expose an org-level usage/cost API
 *   - Rate limit headers provide real-time RPM/TPM information
 */

const DEFAULT_BASE_URL = 'https://api.groq.com';

/**
 * Parse Groq rate limit headers (OpenAI-compatible format)
 */
const parseGroqRateLimits = (headers) => {
  const h = headers || {};
  const parseNum = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
  const parseReset = (v) => {
    if (!v) return null;
    // Groq reset headers are typically in seconds from now, or ISO timestamps
    if (isNaN(Number(v))) return new Date(v);
    // If small number, treat as seconds offset; if large, treat as epoch
    const num = Number(v);
    return num < 1e10 ? new Date(Date.now() + num * 1000) : new Date(num * 1000);
  };

  return {
    requestsLimit: parseNum(h['x-ratelimit-limit-requests']),
    requestsRemaining: parseNum(h['x-ratelimit-remaining-requests']),
    requestsReset: parseReset(h['x-ratelimit-reset-requests']),
    tokensLimit: parseNum(h['x-ratelimit-limit-tokens']),
    tokensRemaining: parseNum(h['x-ratelimit-remaining-tokens']),
    tokensReset: parseReset(h['x-ratelimit-reset-tokens']),
    retryAfter: parseNum(h['retry-after']),
  };
};

/**
 * Parse token usage from Groq completion response body (OpenAI-compatible)
 */
const parseGroqUsage = (responseData) => {
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
 * Uses GET /openai/v1/models — no tokens consumed.
 */
const checkHealth = async ({ apiKey, baseUrl, timeout }) => {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${base}/openai/v1/models`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: timeout || 10000,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const headers = response.headers || {};
    const rateLimits = parseGroqRateLimits(headers);

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
    } else if (response.status === 429) {
      errorType = 'RATE_LIMITED';
      errorMessage = response.data?.error?.message || 'Rate limit exceeded';
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

module.exports = { checkHealth, parseGroqRateLimits, parseGroqUsage };
