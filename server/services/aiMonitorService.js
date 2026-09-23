const AIProvider = require('../models/AIProvider');
const AIUsageLog = require('../models/AIUsageLog');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { decrypt } = require('../utils/encryption');
const { getProvider } = require('./aiProviders/providerFactory');
const { sendAlertEmail } = require('../config/email');
const axios = require('axios');

/**
 * AI Monitor Service
 *
 * Mirrors the structure of monitorService.js for normal APIs.
 * Provides:
 *   - checkAIProvider(aiProvider)  — scheduled health check + log
 *   - testAIProviderNow(aiProvider) — on-demand test (no DB write)
 *   - calculateAIHealthScore(...)  — transparent rule-based score
 *   - getHealthGrade(score)        — grade label
 */

/**
 * Calculate AI health score (0–100), rule-based.
 * Inputs:
 *   success          — boolean
 *   responseTime     — ms
 *   uptimePct        — last N checks uptime %
 *   rateLimitPressure — 0–1 (0 = no pressure, 1 = exhausted)
 *   statusCode       — HTTP status
 */
const calculateAIHealthScore = ({ success, responseTime, uptimePct, rateLimitPressure, statusCode }) => {
  let score = 0;

  // Availability (40 pts)
  if (success) score += 40;

  // Response time (30 pts)
  if (success && responseTime !== null) {
    if (responseTime < 500) score += 30;
    else if (responseTime < 1500) score += 25;
    else if (responseTime < 3000) score += 18;
    else if (responseTime < 6000) score += 10;
    else score += 3;
  }

  // Uptime (20 pts)
  if (uptimePct !== undefined && uptimePct !== null) {
    score += Math.round((uptimePct / 100) * 20);
  }

  // Status code (5 pts)
  if (statusCode) {
    if (statusCode >= 200 && statusCode < 300) score += 5;
    else if (statusCode >= 300 && statusCode < 400) score += 3;
    else if (statusCode === 429) score += 1; // rate limited but reachable
  }

  // Rate limit pressure penalty (up to -5 pts)
  if (rateLimitPressure !== null && rateLimitPressure !== undefined) {
    score -= Math.round(rateLimitPressure * 5);
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
 * Calculate rate limit pressure (0–1).
 * 0 = plenty remaining, 1 = exhausted.
 */
const calcRateLimitPressure = (rateLimits) => {
  if (!rateLimits) return null;
  const { requestsLimit, requestsRemaining, tokensLimit, tokensRemaining } = rateLimits;

  const pressures = [];
  if (requestsLimit && requestsRemaining !== null) {
    pressures.push(1 - requestsRemaining / requestsLimit);
  }
  if (tokensLimit && tokensRemaining !== null) {
    pressures.push(1 - tokensRemaining / tokensLimit);
  }

  if (!pressures.length) return null;
  return Math.max(...pressures);
};

/**
 * Send alert via Slack/Discord webhooks (reuses same pattern as monitorService)
 */
const sendWebhooks = async (userId, providerName, message, type) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    if (user.slackWebhookUrl) {
      axios.post(user.slackWebhookUrl, {
        text: `🤖 *AI Provider Alert:* ${providerName}\n*Status:* ${message}\n*Type:* ${type}`,
      }).catch(() => {});
    }

    if (user.discordWebhookUrl) {
      axios.post(user.discordWebhookUrl, {
        embeds: [{
          title: `🤖 AI Provider Alert: ${providerName}`,
          description: message,
          color: type === 'down' ? 15158332 : 16776960,
          fields: [{ name: 'Type', value: type, inline: true }],
          timestamp: new Date().toISOString(),
        }]
      }).catch(() => {});
    }
  } catch (err) {
    console.error('AI webhook dispatch error:', err.message);
  }
};

/**
 * Create an alert for an AI provider.
 * Cooldown: 30 minutes (same as normal API alerts).
 * Reuses the existing Alert model with a special field pattern.
 */
const createAIAlert = async (aiProvider, message, type, statusCode = null) => {
  try {
    // Use a synthetic "apiId" approach — store provider ID in apiId field
    // The Alert model requires apiId, so we store the AIProvider _id there
    const recentAlert = await Alert.findOne({
      apiId: aiProvider._id,
      type,
      resolved: false,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
    });

    if (recentAlert) return; // cooldown

    const alert = await Alert.create({
      apiId: aiProvider._id,  // stores AIProvider _id (consistent field reuse)
      userId: aiProvider.userId,
      message: `[AI] ${aiProvider.providerName}: ${message}`,
      type,
      statusCode,
    });

    sendWebhooks(aiProvider.userId, aiProvider.providerName, message, type).catch(() => {});

    if (process.env.EMAIL_USER) {
      try {
        const user = await User.findById(aiProvider.userId);
        if (user && user.emailNotifications) {
          const sent = await sendAlertEmail({
            to: user.email,
            apiName: `[AI Provider] ${aiProvider.providerName}`,
            message,
            timestamp: alert.createdAt,
          });
          if (sent) await Alert.findByIdAndUpdate(alert._id, { emailSent: true });
        }
      } catch (emailErr) {
        console.error('AI alert email error:', emailErr.message);
      }
    }
  } catch (err) {
    console.error('AI alert creation error:', err.message);
  }
};

/**
 * Update uptime percentage for an AI provider based on last 100 logs.
 */
const updateAIUptimePercentage = async (aiProviderId) => {
  try {
    const logs = await AIUsageLog.find({ aiProviderId }).sort({ checkedAt: -1 }).limit(100);
    if (!logs.length) return;
    const uptime = Math.round((logs.filter(l => l.success).length / logs.length) * 1000) / 10;
    await AIProvider.findByIdAndUpdate(aiProviderId, { uptimePercentage: uptime });
  } catch (err) {
    console.error('AI uptime update error:', err.message);
  }
};

/**
 * Main scheduled check for a single AI provider.
 * Mirrors checkApi() from monitorService.js.
 */
const checkAIProvider = async (aiProvider) => {
  const now = new Date();
  const startTime = Date.now();

  let logData = {
    aiProviderId: aiProvider._id,
    userId: aiProvider.userId,
    provider: aiProvider.providerType,
    providerName: aiProvider.providerName,
    model: aiProvider.model || null,
    success: false,
    checkedAt: now,
  };

  try {
    // Decrypt credentials — never leave plaintext in variables longer than needed
    const apiKey = decrypt(aiProvider.encryptedApiKey);
    const adminKey = aiProvider.encryptedAdminKey ? decrypt(aiProvider.encryptedAdminKey) : null;

    if (!apiKey) {
      logData.errorType = 'INVALID_CONFIGURATION';
      logData.errorMessage = 'API key not configured or decryption failed';
      await AIUsageLog.create(logData);
      await AIProvider.findByIdAndUpdate(aiProvider._id, {
        lastCheckAt: now,
        lastStatus: 'down',
      });
      await createAIAlert(aiProvider, 'API key not configured or could not be decrypted', 'down');
      return;
    }

    // Get the appropriate provider adapter
    const provider = getProvider(aiProvider);

    // Run health check
    const checkResult = await provider.checkHealth({
      apiKey,
      adminKey,
      baseUrl: aiProvider.baseUrl,
      model: aiProvider.model,
      timeout: aiProvider.timeout,
      authType: aiProvider.authType,
      authHeaderName: aiProvider.authHeaderName,
      customCheckUrl: aiProvider.customCheckUrl,
      customCheckMethod: aiProvider.customCheckMethod,
      customCheckBody: aiProvider.customCheckBody,
      expectedStatus: aiProvider.expectedStatus,
    });

    const responseTime = Date.now() - startTime;

    // Get recent logs to calculate uptime for health score
    const recentLogs = await AIUsageLog.find({ aiProviderId: aiProvider._id })
      .sort({ checkedAt: -1 }).limit(99).select('success');
    const allLogs = [{ success: checkResult.success }, ...recentLogs];
    const uptimePct = Math.round((allLogs.filter(l => l.success).length / allLogs.length) * 1000) / 10;

    // Calculate rate limit pressure
    const rateLimitPressure = calcRateLimitPressure(checkResult.rateLimits);

    // Calculate health score
    const healthScore = calculateAIHealthScore({
      success: checkResult.success,
      responseTime: checkResult.responseTime || responseTime,
      uptimePct,
      rateLimitPressure,
      statusCode: checkResult.statusCode,
    });

    // Build log entry
    logData = {
      ...logData,
      statusCode: checkResult.statusCode,
      success: checkResult.success,
      responseTime: checkResult.responseTime || responseTime,
      timedOut: checkResult.timedOut || false,
      errorType: checkResult.errorType || null,
      errorMessage: checkResult.errorMessage || null,
      healthScore,
      responseSize: checkResult.responseSize || null,
      selectedHeaders: checkResult.safeHeaders
        ? new Map(Object.entries(checkResult.safeHeaders))
        : new Map(),

      // Token usage (mainly from Anthropic minimal request)
      inputTokens: checkResult.tokenUsage?.inputTokens ?? null,
      outputTokens: checkResult.tokenUsage?.outputTokens ?? null,
      totalTokens: checkResult.tokenUsage?.totalTokens ?? null,
      cachedTokens: checkResult.tokenUsage?.cachedTokens ?? null,
      thinkingTokens: checkResult.tokenUsage?.thinkingTokens ?? null,

      // Rate limits
      requestsLimit: checkResult.rateLimits?.requestsLimit ?? null,
      requestsRemaining: checkResult.rateLimits?.requestsRemaining ?? null,
      requestsReset: checkResult.rateLimits?.requestsReset ?? null,
      tokensLimit: checkResult.rateLimits?.tokensLimit ?? null,
      tokensRemaining: checkResult.rateLimits?.tokensRemaining ?? null,
      tokensReset: checkResult.rateLimits?.tokensReset ?? null,
      retryAfter: checkResult.rateLimits?.retryAfter ?? null,

      costSource: 'unavailable',
    };

    // Determine status
    let newStatus = 'healthy';
    if (!checkResult.success) newStatus = 'down';
    else if ((checkResult.responseTime || responseTime) > 5000) newStatus = 'degraded';

    // Update AIProvider document
    const providerUpdate = {
      lastCheckAt: now,
      lastStatus: newStatus,
      healthScore,
      healthGrade: getHealthGrade(healthScore),
    };

    if (checkResult.rateLimits?.requestsLimit) {
      providerUpdate.lastRequestsLimit = checkResult.rateLimits.requestsLimit;
    }
    if (checkResult.rateLimits?.requestsRemaining !== null && checkResult.rateLimits?.requestsRemaining !== undefined) {
      providerUpdate.lastRequestsRemaining = checkResult.rateLimits.requestsRemaining;
    }
    if (checkResult.rateLimits?.tokensLimit) {
      providerUpdate.lastTokensLimit = checkResult.rateLimits.tokensLimit;
    }
    if (checkResult.rateLimits?.tokensRemaining !== null && checkResult.rateLimits?.tokensRemaining !== undefined) {
      providerUpdate.lastTokensRemaining = checkResult.rateLimits.tokensRemaining;
    }

    await AIProvider.findByIdAndUpdate(aiProvider._id, providerUpdate);

    // Generate alerts
    if (!checkResult.success) {
      const alertType = checkResult.errorType === 'REQUEST_TIMEOUT' ? 'timeout'
        : checkResult.statusCode === 429 ? 'quota_exceeded'
        : 'down';
      await createAIAlert(
        aiProvider,
        checkResult.errorMessage || `Provider returned ${checkResult.statusCode}`,
        alertType,
        checkResult.statusCode
      );
    }

    // Rate limit exhaustion alert (< 10% remaining)
    if (checkResult.rateLimits?.requestsLimit && checkResult.rateLimits?.requestsRemaining !== null) {
      const pct = checkResult.rateLimits.requestsRemaining / checkResult.rateLimits.requestsLimit;
      if (pct < 0.1) {
        await createAIAlert(
          aiProvider,
          `Rate limit nearly exhausted: ${checkResult.rateLimits.requestsRemaining} requests remaining`,
          'quota_exceeded',
          null
        );
      }
    }

    // High latency alert
    const latency = checkResult.responseTime || responseTime;
    if (checkResult.success && latency > (aiProvider.latencyAlertMs || 5000)) {
      await createAIAlert(
        aiProvider,
        `High latency detected: ${latency}ms (threshold: ${aiProvider.latencyAlertMs || 5000}ms)`,
        'status_mismatch',
        checkResult.statusCode
      );
    }

  } catch (err) {
    const responseTime = Date.now() - startTime;
    const timedOut = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
    logData = {
      ...logData,
      success: false,
      responseTime,
      timedOut,
      errorType: timedOut ? 'REQUEST_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
      errorMessage: err.message,
    };

    await AIProvider.findByIdAndUpdate(aiProvider._id, {
      lastCheckAt: now,
      lastStatus: 'down',
    });

    await createAIAlert(
      aiProvider,
      err.message,
      timedOut ? 'timeout' : 'down',
      null
    );
  }

  // Save log
  await AIUsageLog.create(logData);

  // Update uptime
  await updateAIUptimePercentage(aiProvider._id);
};

/**
 * On-demand test for an AI provider (for "Test Now" button).
 * Does NOT write to the database.
 * Never returns sensitive credentials.
 */
const testAIProviderNow = async (aiProvider) => {
  const startTime = Date.now();

  try {
    const apiKey = decrypt(aiProvider.encryptedApiKey);
    if (!apiKey) {
      return {
        success: false,
        error: 'API key not configured or could not be decrypted',
        errorType: 'INVALID_CONFIGURATION',
      };
    }

    const provider = getProvider(aiProvider);

    const checkResult = await provider.checkHealth({
      apiKey,
      baseUrl: aiProvider.baseUrl,
      model: aiProvider.model,
      timeout: aiProvider.timeout,
      authType: aiProvider.authType,
      authHeaderName: aiProvider.authHeaderName,
      customCheckUrl: aiProvider.customCheckUrl,
      customCheckMethod: aiProvider.customCheckMethod,
      customCheckBody: aiProvider.customCheckBody,
      expectedStatus: aiProvider.expectedStatus,
    });

    return {
      success: checkResult.success,
      statusCode: checkResult.statusCode,
      responseTime: checkResult.responseTime || (Date.now() - startTime),
      timedOut: checkResult.timedOut || false,
      errorType: checkResult.errorType || null,
      errorMessage: checkResult.errorMessage || null,
      rateLimits: checkResult.rateLimits || {},
      tokenUsage: checkResult.tokenUsage || null,
      responseSize: checkResult.responseSize || null,
      safeHeaders: checkResult.safeHeaders || {},
      checkStrategy: checkResult.checkStrategy,
      checkNote: checkResult.checkNote || null,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const timedOut = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
    return {
      success: false,
      responseTime,
      timedOut,
      errorType: timedOut ? 'REQUEST_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
      error: err.message,
    };
  }
};

module.exports = {
  checkAIProvider,
  testAIProviderNow,
  calculateAIHealthScore,
  getHealthGrade,
};
