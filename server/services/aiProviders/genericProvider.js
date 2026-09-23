const axios = require('axios');

/**
 * Generic / Custom AI Provider Adapter
 *
 * Allows users to monitor any AI API endpoint by specifying:
 *   - URL
 *   - HTTP method (GET, POST, HEAD)
 *   - Auth type (bearer, api_key_header, query_param, custom_header)
 *   - Custom request body (JSON template)
 *   - Expected status code
 *
 * Rate limit parsing uses common header patterns:
 *   x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset, retry-after
 *
 * Token usage: not attempted for generic providers (no standard format)
 */

/**
 * Build auth headers/params based on auth type
 */
const buildGenericAuth = ({ apiKey, authType, authHeaderName }) => {
  const headers = {};
  const params = {};

  if (!apiKey) return { headers, params };

  switch (authType) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'api_key_header':
      headers[authHeaderName || 'X-API-Key'] = apiKey;
      break;
    case 'query_param':
      params[authHeaderName || 'api_key'] = apiKey;
      break;
    case 'custom_header':
      headers[authHeaderName || 'X-Custom-Auth'] = apiKey;
      break;
    default:
      headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return { headers, params };
};

/**
 * Parse generic rate limit headers
 */
const parseGenericRateLimits = (headers) => {
  const h = headers || {};
  const parseNum = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
  const parseReset = (v) => {
    if (!v) return null;
    return isNaN(Number(v)) ? new Date(v) : new Date(Number(v) * 1000);
  };

  const limit = parseNum(h['x-ratelimit-limit'] || h['x-ratelimit-limit-requests'] || h['ratelimit-limit']);
  const remaining = parseNum(h['x-ratelimit-remaining'] || h['x-ratelimit-remaining-requests'] || h['ratelimit-remaining']);
  const reset = parseReset(h['x-ratelimit-reset'] || h['x-ratelimit-reset-requests'] || h['ratelimit-reset']);
  const tokensLimit = parseNum(h['x-ratelimit-limit-tokens']);
  const tokensRemaining = parseNum(h['x-ratelimit-remaining-tokens']);
  const tokensReset = parseReset(h['x-ratelimit-reset-tokens']);
  const retryAfter = parseNum(h['retry-after']);

  return {
    requestsLimit: limit,
    requestsRemaining: remaining,
    requestsReset: reset,
    tokensLimit,
    tokensRemaining,
    tokensReset,
    retryAfter,
  };
};

/**
 * Perform a generic health check.
 */
const checkHealth = async ({
  apiKey, authType, authHeaderName,
  baseUrl, customCheckUrl, customCheckMethod, customCheckBody,
  expectedStatus, timeout,
}) => {
  const url = customCheckUrl || baseUrl;
  if (!url) {
    return {
      success: false,
      statusCode: null,
      responseTime: 0,
      errorType: 'INVALID_CONFIGURATION',
      errorMessage: 'No URL configured for generic provider',
      rateLimits: {},
      safeHeaders: {},
      checkStrategy: 'custom',
    };
  }

  const method = (customCheckMethod || 'GET').toLowerCase();
  const startTime = Date.now();
  const { headers: authHeaders, params: authParams } = buildGenericAuth({ apiKey, authType, authHeaderName });

  let requestBody;
  if (customCheckBody) {
    try { requestBody = JSON.parse(customCheckBody); } catch { requestBody = customCheckBody; }
  }

  try {
    const response = await axios({
      method,
      url,
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      params: authParams,
      data: method !== 'get' && method !== 'head' ? requestBody : undefined,
      timeout: timeout || 10000,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const headers = response.headers || {};
    const rateLimits = parseGenericRateLimits(headers);

    const bodyStr = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data || '');
    const responseSize = Buffer.byteLength(bodyStr, 'utf8');

    // Expose safe headers (remove auth-related ones)
    const safeHeaders = {};
    const BLOCKED = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];
    for (const [k, v] of Object.entries(headers)) {
      if (!BLOCKED.includes(k.toLowerCase())) {
        safeHeaders[k] = String(v);
      }
    }

    const targetStatus = expectedStatus || 200;
    const success = response.status === targetStatus;

    let errorType = null;
    let errorMessage = null;

    if (response.status === 401 || response.status === 403) {
      errorType = 'INVALID_CREDENTIALS';
      errorMessage = 'Invalid credentials';
    } else if (response.status === 429) {
      errorType = 'RATE_LIMITED';
      errorMessage = 'Rate limit exceeded';
    } else if (!success) {
      errorType = 'PROVIDER_ERROR';
      errorMessage = `Expected ${targetStatus}, got ${response.status}`;
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
      checkStrategy: 'custom',
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
      checkStrategy: 'custom',
    };
  }
};

module.exports = { checkHealth, buildGenericAuth, parseGenericRateLimits };
