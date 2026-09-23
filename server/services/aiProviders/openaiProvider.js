const axios = require('axios');

/**
 * OpenAI Provider Adapter
 *
 * Health Check Strategy:
 *   - Default: GET /v1/models — lightweight, no tokens consumed, returns 200 with model list
 *   - Labeled: "Models List Check"
 *
 * Usage Monitoring:
 *   - OpenAI Usage API: /v1/organization/usage/* (requires Admin Key with org permissions)
 *   - OpenAI Costs API: /v1/organization/costs (requires Admin Key)
 *   - If no admin key or insufficient permissions: returns a clear permission notice
 *
 * Rate Limit Headers (from API responses):
 *   x-ratelimit-limit-requests
 *   x-ratelimit-remaining-requests
 *   x-ratelimit-reset-requests
 *   x-ratelimit-limit-tokens
 *   x-ratelimit-remaining-tokens
 *   x-ratelimit-reset-tokens
 */

const DEFAULT_BASE_URL = 'https://api.openai.com';

/**
 * Parse OpenAI-specific rate limit headers
 */
const parseOpenAIRateLimits = (headers) => {
  const h = headers || {};

  const parseNum = (val) => {
    const n = parseInt(val);
    return isNaN(n) ? null : n;
  };

  const parseReset = (val) => {
    if (!val) return null;
    // OpenAI reset headers can be ISO strings or epoch seconds
    if (isNaN(Number(val))) return new Date(val);
    return new Date(Number(val) * 1000);
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
 * Parse usage from an OpenAI response body (e.g. from /v1/chat/completions)
 */
const parseOpenAIUsage = (responseData) => {
  const usage = responseData?.usage;
  if (!usage) return {};
  return {
    inputTokens: usage.prompt_tokens ?? null,
    outputTokens: usage.completion_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? null,
  };
};

/**
 * Perform the health check.
 * Returns normalized result object.
 */
const checkHealth = async ({ apiKey, baseUrl, timeout }) => {
  let base = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/$/, '');
  if (base.endsWith('api.openai.co')) {
    base += 'm';
  }
  const url = `${base}/v1/models`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: timeout || 10000,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const headers = response.headers || {};
    const rateLimits = parseOpenAIRateLimits(headers);

    const bodyStr = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data || '');
    const responseSize = Buffer.byteLength(bodyStr, 'utf8');

    // Safe headers to expose (strip auth)
    const safeHeaders = {};
    const allowedHeaders = [
      'content-type', 'x-request-id', 'openai-organization',
      'openai-version', 'openai-processing-ms',
      'x-ratelimit-limit-requests', 'x-ratelimit-remaining-requests',
      'x-ratelimit-reset-requests', 'x-ratelimit-limit-tokens',
      'x-ratelimit-remaining-tokens', 'x-ratelimit-reset-tokens',
    ];
    for (const key of allowedHeaders) {
      if (headers[key]) safeHeaders[key] = String(headers[key]);
    }

    const success = response.status === 200;
    let errorType = null;
    let errorMessage = null;

    if (response.status === 401) {
      errorType = 'INVALID_CREDENTIALS';
      errorMessage = 'Invalid API key or unauthorized';
    } else if (response.status === 429) {
      errorType = 'RATE_LIMITED';
      errorMessage = 'Rate limit exceeded';
    } else if (response.status === 403) {
      errorType = 'PERMISSION_DENIED';
      errorMessage = 'Permission denied';
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

/**
 * Fetch OpenAI organization usage data.
 * Requires an Admin Key (separate from API key).
 * Endpoint: /v1/organization/usage/completions
 *
 * Returns normalized usage or a permission notice.
 */
const getUsage = async ({ adminKey, baseUrl, startTime, endTime }) => {
  if (!adminKey) {
    return {
      available: false,
      reason: 'USAGE_API_UNAVAILABLE',
      message: 'Usage monitoring requires an OpenAI Admin Key with organization/project permissions.',
    };
  }

  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const params = {};
  if (startTime) params.start_time = Math.floor(new Date(startTime).getTime() / 1000);
  if (endTime) params.end_time = Math.floor(new Date(endTime).getTime() / 1000);

  try {
    const response = await axios.get(`${base}/v1/organization/usage/completions`, {
      headers: {
        Authorization: `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
      params,
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        available: false,
        reason: 'PERMISSION_DENIED',
        message: 'Usage monitoring requires the appropriate OpenAI organization/project permissions.',
      };
    }

    if (response.status !== 200) {
      return {
        available: false,
        reason: 'USAGE_API_UNAVAILABLE',
        message: `OpenAI Usage API returned HTTP ${response.status}`,
      };
    }

    return { available: true, data: response.data };
  } catch (err) {
    return {
      available: false,
      reason: 'USAGE_API_UNAVAILABLE',
      message: err.message,
    };
  }
};

/**
 * Fetch OpenAI organization costs.
 * Endpoint: /v1/organization/costs
 */
const getCosts = async ({ adminKey, baseUrl, startTime, endTime }) => {
  if (!adminKey) {
    return {
      available: false,
      reason: 'USAGE_API_UNAVAILABLE',
      message: 'Cost monitoring requires an OpenAI Admin Key.',
    };
  }

  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const params = {};
  if (startTime) params.start_time = Math.floor(new Date(startTime).getTime() / 1000);
  if (endTime) params.end_time = Math.floor(new Date(endTime).getTime() / 1000);

  try {
    const response = await axios.get(`${base}/v1/organization/costs`, {
      headers: { Authorization: `Bearer ${adminKey}` },
      params,
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status === 401 || response.status === 403) {
      return {
        available: false,
        reason: 'PERMISSION_DENIED',
        message: 'Usage monitoring requires the appropriate OpenAI organization/project permissions.',
      };
    }

    if (response.status !== 200) {
      return { available: false, reason: 'USAGE_API_UNAVAILABLE', message: `HTTP ${response.status}` };
    }

    return { available: true, data: response.data };
  } catch (err) {
    return { available: false, reason: 'USAGE_API_UNAVAILABLE', message: err.message };
  }
};

module.exports = { checkHealth, getUsage, getCosts, parseOpenAIRateLimits, parseOpenAIUsage };
