const axios = require('axios');

/**
 * Google Gemini Provider Adapter
 *
 * Health Check Strategy:
 *   - GET /v1beta/models — lightweight model list, no tokens consumed
 *   - Labeled: "Models List Check"
 *
 * Token Usage:
 *   - Extracted from response body `usageMetadata` when present (per-request metadata)
 *   - Fields: promptTokenCount, candidatesTokenCount, totalTokenCount,
 *             cachedContentTokenCount, thoughtsTokenCount (where available)
 *
 * Rate Limits:
 *   - Gemini exposes rate limit info via headers when limits are hit (429)
 *   - Parsed from x-ratelimit-* or retry-after headers where present
 *
 * Account-Level Usage/Billing:
 *   - Google Cloud Billing API is a separate service requiring Cloud IAM permissions
 *   - NOT implemented here — only per-response token metadata is captured
 */

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

/**
 * Parse Gemini-specific rate limit headers
 */
const parseGeminiRateLimits = (headers) => {
  const h = headers || {};
  const parseNum = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
  const parseReset = (v) => {
    if (!v) return null;
    return isNaN(Number(v)) ? new Date(v) : new Date(Number(v) * 1000);
  };

  return {
    requestsLimit: parseNum(h['x-ratelimit-limit-requests'] || h['x-ratelimit-limit']),
    requestsRemaining: parseNum(h['x-ratelimit-remaining-requests'] || h['x-ratelimit-remaining']),
    requestsReset: parseReset(h['x-ratelimit-reset-requests'] || h['x-ratelimit-reset']),
    tokensLimit: parseNum(h['x-ratelimit-limit-tokens']),
    tokensRemaining: parseNum(h['x-ratelimit-remaining-tokens']),
    tokensReset: parseReset(h['x-ratelimit-reset-tokens']),
    retryAfter: parseNum(h['retry-after']),
  };
};

/**
 * Parse Gemini token usage from response body usageMetadata
 */
const parseGeminiUsage = (responseData) => {
  const usage = responseData?.usageMetadata;
  if (!usage) return {};
  return {
    inputTokens: usage.promptTokenCount ?? null,
    outputTokens: usage.candidatesTokenCount ?? null,
    totalTokens: usage.totalTokenCount ?? null,
    cachedTokens: usage.cachedContentTokenCount ?? null,
    thinkingTokens: usage.thoughtsTokenCount ?? null,
  };
};

/**
 * Perform the health check.
 * Uses GET /v1beta/models?key=API_KEY — no tokens consumed.
 */
const checkHealth = async ({ apiKey, baseUrl, timeout }) => {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${base}/v1beta/models`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      params: { key: apiKey },
      timeout: timeout || 10000,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const headers = response.headers || {};
    const rateLimits = parseGeminiRateLimits(headers);

    const bodyStr = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data || '');
    const responseSize = Buffer.byteLength(bodyStr, 'utf8');

    const safeHeaders = {};
    const allowedHeaders = [
      'content-type', 'x-request-id', 'x-goog-request-id',
      'x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests',
      'x-ratelimit-limit-tokens', 'x-ratelimit-remaining-tokens',
      'retry-after',
    ];
    for (const key of allowedHeaders) {
      if (headers[key]) safeHeaders[key] = String(headers[key]);
    }

    const success = response.status === 200;
    let errorType = null;
    let errorMessage = null;

    if (response.status === 400) {
      errorType = 'INVALID_CONFIGURATION';
      errorMessage = response.data?.error?.message || 'Bad request';
    } else if (response.status === 401 || response.status === 403) {
      errorType = 'INVALID_CREDENTIALS';
      errorMessage = 'Invalid API key or permission denied';
    } else if (response.status === 429) {
      errorType = 'RATE_LIMITED';
      errorMessage = response.data?.error?.message || 'Rate limit / quota exceeded (RESOURCE_EXHAUSTED)';
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

module.exports = { checkHealth, parseGeminiRateLimits, parseGeminiUsage };
