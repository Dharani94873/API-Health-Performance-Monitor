const axios = require('axios');
const Api = require('../models/Api');
const Log = require('../models/Log');
const Alert = require('../models/Alert');
const { sendAlertEmail } = require('../config/email');
const User = require('../models/User');
const { decrypt } = require('../utils/encryption');
const { checkSSL } = require('./sslService');

/**
 * Build auth headers from decrypted API credentials
 */
const buildAuthHeaders = (authentication, url) => {
  const headers = {};
  const params = {};

  if (!authentication || authentication.type === 'none') return { headers, params };

  switch (authentication.type) {
    case 'apiKey': {
      const apiKey = decrypt(authentication.apiKeyEncrypted);
      if (apiKey) {
        if (authentication.apiKeyLocation === 'query') {
          const headerName = authentication.apiKeyHeader || 'api_key';
          params[headerName] = apiKey;
        } else {
          headers[authentication.apiKeyHeader || 'X-API-Key'] = apiKey;
        }
      }
      break;
    }
    case 'bearer': {
      const token = decrypt(authentication.bearerTokenEncrypted);
      if (token) headers['Authorization'] = `Bearer ${token}`;
      break;
    }
    case 'basic': {
      const username = decrypt(authentication.basicUsernameEncrypted) || '';
      const password = decrypt(authentication.basicPasswordEncrypted) || '';
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      break;
    }
    case 'custom': {
      const customJson = decrypt(authentication.customHeadersEncrypted);
      if (customJson) {
        try {
          const customHeaders = JSON.parse(customJson);
          Object.assign(headers, customHeaders);
        } catch {}
      }
      break;
    }
  }

  return { headers, params };
};

/**
 * Parse rate limit headers from response
 */
const parseRateLimit = (responseHeaders) => {
  const h = responseHeaders;
  const limit = parseInt(h['x-ratelimit-limit'] || h['x-rate-limit-limit'] || h['ratelimit-limit']) || null;
  const remaining = parseInt(h['x-ratelimit-remaining'] || h['x-rate-limit-remaining'] || h['ratelimit-remaining']) || null;
  const reset = h['x-ratelimit-reset'] || h['x-rate-limit-reset'] || h['ratelimit-reset'] || null;
  const retryAfter = parseInt(h['retry-after']) || null;

  if (!limit && !remaining && !reset && !retryAfter) return null;

  const resetDate = reset ? (isNaN(Number(reset)) ? new Date(reset) : new Date(Number(reset) * 1000)) : null;
  const used = (limit && remaining !== null) ? limit - remaining : null;

  return { limit, remaining, reset: resetDate, retryAfter, used };
};

/**
 * Calculate health score (0–100) based on check results
 */
const calculateHealthScore = ({ success, responseTime, timeout, statusCode, uptimePct }) => {
  let score = 0;

  // Availability score (40 pts)
  if (success) score += 40;

  // Response time score (30 pts)
  if (success && responseTime !== null) {
    if (responseTime < 300) score += 30;
    else if (responseTime < 800) score += 25;
    else if (responseTime < 1500) score += 18;
    else if (responseTime < 3000) score += 10;
    else score += 3;
  }

  // Uptime score (20 pts)
  if (uptimePct !== undefined) {
    score += Math.round((uptimePct / 100) * 20);
  }

  // Status code score (10 pts)
  if (statusCode) {
    if (statusCode >= 200 && statusCode < 300) score += 10;
    else if (statusCode >= 300 && statusCode < 400) score += 7;
    else if (statusCode >= 400 && statusCode < 500) score += 3;
    else score += 0;
  }

  return Math.min(100, Math.max(0, score));
};

const getHealthGrade = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 40) return 'Average';
  return 'Poor';
};

/**
 * Check a single API and store the result
 */
const checkApi = async (api) => {
  const startTime = Date.now();
  let logData = {
    apiId: api._id,
    userId: api.userId,
    success: false,
    checkedAt: new Date(),
  };

  try {
    // Build auth headers
    const { headers: authHeaders, params: authParams } = buildAuthHeaders(api.authentication, api.apiUrl);

    // Merge with user-defined headers
    const requestHeaders = {
      ...(api.headers ? Object.fromEntries(api.headers) : {}),
      ...authHeaders,
    };

    const response = await axios({
      method: api.method.toLowerCase(),
      url: api.apiUrl,
      timeout: api.timeout,
      headers: requestHeaders,
      params: authParams,
      data: api.requestBody ? JSON.parse(api.requestBody) : undefined,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const success = response.status === api.expectedStatus;

    // Parse headers
    const responseHeaders = response.headers || {};
    const rateLimit = parseRateLimit(responseHeaders);

    // Response size
    const responseBodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');
    const payloadSize = Buffer.byteLength(responseBodyStr, 'utf8');
    const contentLength = parseInt(responseHeaders['content-length']) || payloadSize;
    const contentType = responseHeaders['content-type'] || null;

    // Health score
    const healthScore = calculateHealthScore({
      success,
      responseTime,
      timeout: api.timeout,
      statusCode: response.status,
      uptimePct: api.uptimePercentage,
    });

    logData = {
      ...logData,
      statusCode: response.status,
      responseTime,
      success,
      responseSize: payloadSize,
      payloadSize,
      contentType,
      contentLength,
      responseHeaders: new Map(Object.entries(responseHeaders).map(([k, v]) => [k, String(v)])),
      rateLimit,
      healthScore,
      errorMessage: success ? null : `Expected ${api.expectedStatus}, got ${response.status}`,
    };

    // Update API status fields
    let newStatus = 'healthy';
    if (!success) newStatus = 'down';
    else if (responseTime > 3000) newStatus = 'degraded';

    const apiUpdate = {
      lastChecked: new Date(),
      lastStatus: newStatus,
      healthScore,
      healthGrade: getHealthGrade(healthScore),
    };

    // Store rate limit info on the API document
    if (rateLimit) {
      if (rateLimit.limit) apiUpdate.quotaLimit = rateLimit.limit;
      if (rateLimit.remaining !== null) apiUpdate.quotaRemaining = rateLimit.remaining;
      if (rateLimit.reset) apiUpdate.quotaReset = rateLimit.reset;
      if (rateLimit.used !== null) apiUpdate.quotaUsed = rateLimit.used;
    }

    await Api.findByIdAndUpdate(api._id, apiUpdate);

    // Alerts
    if (!success) {
      await createAlert(api, `Status ${response.status} (expected ${api.expectedStatus})`, 'status_mismatch', response.status);
    }

    // Quota almost exhausted alert
    if (rateLimit && rateLimit.limit && rateLimit.remaining !== null) {
      const usagePct = ((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) * 100;
      if (usagePct >= 90) {
        await createAlert(api, `Quota ${Math.round(usagePct)}% used (${rateLimit.remaining} remaining)`, 'quota_exceeded', response.status);
      }
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage = error.message;
    let alertType = 'down';

    if (error.code === 'ECONNABORTED') {
      errorMessage = `Timeout after ${api.timeout}ms`;
      alertType = 'timeout';
    }

    const healthScore = calculateHealthScore({ success: false, responseTime, timeout: api.timeout, statusCode: null, uptimePct: api.uptimePercentage });

    logData = {
      ...logData,
      statusCode: null,
      responseTime,
      success: false,
      errorMessage,
      healthScore,
    };

    await Api.findByIdAndUpdate(api._id, {
      lastChecked: new Date(),
      lastStatus: 'down',
      healthScore,
      healthGrade: getHealthGrade(healthScore),
    });

    await createAlert(api, errorMessage, alertType, null);
  }

  // Save log
  await Log.create(logData);

  // Update uptime percentage
  await updateUptimePercentage(api._id);

  // Check SSL (async, don't block monitoring)
  checkSSLAndUpdate(api).catch(() => {});
};

/**
 * Check SSL and update API document (runs async)
 */
const checkSSLAndUpdate = async (api) => {
  try {
    const sslInfo = await checkSSL(api.apiUrl);
    if (sslInfo.notHttps) return;

    const update = {
      sslValid: sslInfo.valid,
      sslLastChecked: new Date(),
    };

    if (sslInfo.expiry) update.sslExpiry = new Date(sslInfo.expiry);
    if (sslInfo.daysRemaining !== undefined) update.sslDaysRemaining = sslInfo.daysRemaining;
    if (sslInfo.issuer) update.sslIssuer = sslInfo.issuer;

    await Api.findByIdAndUpdate(api._id, update);

    // SSL expiry warning
    if (sslInfo.daysRemaining !== null && sslInfo.daysRemaining <= 30) {
      await createAlert(
        api,
        `SSL certificate expires in ${sslInfo.daysRemaining} days (${new Date(sslInfo.expiry).toLocaleDateString()})`,
        'ssl_expiring',
        null
      );
    }
  } catch (err) {
    console.error('SSL check error:', err.message);
  }
};

/**
 * Run an immediate test on an API (for "Test API" button)
 */
const testApiNow = async (api) => {
  const startTime = Date.now();

  try {
    const { headers: authHeaders, params: authParams } = buildAuthHeaders(api.authentication, api.apiUrl);
    const requestHeaders = {
      ...(api.headers ? Object.fromEntries(api.headers) : {}),
      ...authHeaders,
    };

    const response = await axios({
      method: api.method.toLowerCase(),
      url: api.apiUrl,
      timeout: api.timeout,
      headers: requestHeaders,
      params: authParams,
      data: api.requestBody ? JSON.parse(api.requestBody) : undefined,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startTime;
    const responseHeaders = response.headers || {};
    const rateLimit = parseRateLimit(responseHeaders);
    const bodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');
    const responseSize = Buffer.byteLength(bodyStr, 'utf8');
    const bodyPreview = bodyStr.length > 2000 ? bodyStr.substring(0, 2000) + '...' : bodyStr;

    return {
      success: true,
      statusCode: response.status,
      responseTime,
      headers: responseHeaders,
      bodyPreview,
      rateLimit,
      responseSize,
      contentType: responseHeaders['content-type'] || null,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error.message,
      responseTime,
      timedOut: error.code === 'ECONNABORTED',
    };
  }
};

/**
 * Create alert and send email
 */
const createAlert = async (api, message, type, statusCode) => {
  try {
    const recentAlert = await Alert.findOne({
      apiId: api._id,
      type,
      resolved: false,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
    });

    if (recentAlert) return;

    const alert = await Alert.create({
      apiId: api._id,
      userId: api.userId,
      message: `${api.apiName}: ${message}`,
      type,
      statusCode,
    });

    if (process.env.EMAIL_USER) {
      try {
        const user = await User.findById(api.userId);
        if (user && user.emailNotifications) {
          const sent = await sendAlertEmail({ to: user.email, apiName: api.apiName, message, timestamp: alert.createdAt });
          if (sent) await Alert.findByIdAndUpdate(alert._id, { emailSent: true });
        }
      } catch (emailError) {
        console.error('Email error:', emailError.message);
      }
    }
  } catch (error) {
    console.error('Alert creation error:', error.message);
  }
};

/**
 * Update uptime percentage based on last 100 logs
 */
const updateUptimePercentage = async (apiId) => {
  try {
    const logs = await Log.find({ apiId }).sort({ checkedAt: -1 }).limit(100);
    if (!logs.length) return;
    const uptime = Math.round((logs.filter(l => l.success).length / logs.length) * 1000) / 10;
    await Api.findByIdAndUpdate(apiId, { uptimePercentage: uptime });
  } catch (error) {
    console.error('Uptime update error:', error.message);
  }
};

module.exports = { checkApi, testApiNow, calculateHealthScore, getHealthGrade };
