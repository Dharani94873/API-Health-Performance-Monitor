const AIProvider = require('../models/AIProvider');
const AIUsageLog = require('../models/AIUsageLog');
const { decrypt } = require('../utils/encryption');
const { getUsage, getCosts } = require('../services/aiProviders/openaiProvider');

/**
 * Sanitize provider for response (strip encrypted credentials)
 */
const sanitizeProvider = (p) => {
  const obj = p.toObject ? p.toObject() : { ...p };
  delete obj.encryptedApiKey;
  delete obj.encryptedAdminKey;
  return obj;
};

// @desc    Get AI Overview dashboard data
// @route   GET /api/ai-usage/overview
// @access  Private
const getAIOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const providers = await AIProvider.find({ userId });

    const total = providers.length;
    const healthy = providers.filter(p => p.lastStatus === 'healthy').length;
    const degraded = providers.filter(p => p.lastStatus === 'degraded').length;
    const down = providers.filter(p => p.lastStatus === 'down').length;
    const unknown = providers.filter(p => p.lastStatus === 'unknown').length;

    // Last 24h logs
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await AIUsageLog.find({ userId, checkedAt: { $gte: since24h } })
      .select('success responseTime requestsRemaining requestsLimit totalTokens provider checkedAt');

    const successLogs = recentLogs.filter(l => l.success);
    const avgLatency = successLogs.length
      ? Math.round(successLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / successLogs.length)
      : 0;

    const totalTokens24h = recentLogs.reduce((s, l) => s + (l.totalTokens || 0), 0);

    const rateLimitWarnings = providers.filter(p =>
      p.lastRequestsLimit && p.lastRequestsRemaining !== null &&
      (p.lastRequestsRemaining / p.lastRequestsLimit) < 0.1
    ).length;

    // Avg health score
    const withScore = providers.filter(p => p.healthScore !== null);
    const avgHealthScore = withScore.length
      ? Math.round(withScore.reduce((s, p) => s + p.healthScore, 0) / withScore.length)
      : null;

    // Provider type breakdown
    const byType = {};
    for (const p of providers) {
      byType[p.providerType] = (byType[p.providerType] || 0) + 1;
    }

    // Daily trend (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = await AIUsageLog.find({ userId, checkedAt: { $gte: weekAgo } })
      .select('success responseTime totalTokens checkedAt provider');

    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayLogs = weekLogs.filter(l =>
        new Date(l.checkedAt) >= dayStart && new Date(l.checkedAt) <= dayEnd
      );
      const daySuccess = dayLogs.filter(l => l.success);
      const dayAvgRT = daySuccess.length
        ? Math.round(daySuccess.reduce((s, l) => s + (l.responseTime || 0), 0) / daySuccess.length)
        : 0;
      const dayTokens = dayLogs.reduce((s, l) => s + (l.totalTokens || 0), 0);

      dailyTrend.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        checks: dayLogs.length,
        uptime: dayLogs.length > 0
          ? Math.round((daySuccess.length / dayLogs.length) * 100)
          : 100,
        avgLatency: dayAvgRT,
        totalTokens: dayTokens,
      });
    }

    const lastLog = await AIUsageLog.findOne({ userId }).sort({ checkedAt: -1 }).select('checkedAt');

    res.json({
      success: true,
      overview: {
        total, healthy, degraded, down, unknown,
        avgLatency, totalTokens24h, rateLimitWarnings, avgHealthScore,
        checksToday: recentLogs.length,
        successesToday: successLogs.length,
        byType,
        dailyTrend,
        lastChecked: lastLog?.checkedAt || null,
        providers: providers.map(sanitizeProvider),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics for a single AI Provider
// @route   GET /api/ai-providers/:id/analytics
// @access  Private
const getAIProviderAnalytics = async (req, res, next) => {
  try {
    const aiProvider = await AIProvider.findOne({ _id: req.params.id, userId: req.user._id });
    if (!aiProvider) {
      return res.status(404).json({ success: false, message: 'AI Provider not found' });
    }

    const logs = await AIUsageLog.find({ aiProviderId: req.params.id })
      .sort({ checkedAt: -1 })
      .limit(200)
      .select('-selectedHeaders');

    const successLogs = logs.filter(l => l.success);
    const responseTimes = successLogs.map(l => l.responseTime).filter(Boolean).sort((a, b) => a - b);

    const avgLatency = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    const maxLatency = responseTimes.length ? Math.max(...responseTimes) : 0;
    const minLatency = responseTimes.length ? Math.min(...responseTimes) : 0;
    const p95Latency = responseTimes.length
      ? responseTimes[Math.floor(responseTimes.length * 0.95)] || responseTimes[responseTimes.length - 1]
      : 0;

    const uptime = logs.length
      ? Math.round((successLogs.length / logs.length) * 100 * 10) / 10
      : 100;

    const totalInputTokens = logs.reduce((s, l) => s + (l.inputTokens || 0), 0);
    const totalOutputTokens = logs.reduce((s, l) => s + (l.outputTokens || 0), 0);
    const totalTokens = logs.reduce((s, l) => s + (l.totalTokens || 0), 0);

    // Trend data (last 50 checks)
    const trend = logs.slice(0, 50).reverse().map((l, i) => ({
      index: i + 1,
      responseTime: l.responseTime,
      success: l.success,
      checkedAt: l.checkedAt,
      statusCode: l.statusCode,
      totalTokens: l.totalTokens,
      healthScore: l.healthScore,
    }));

    // Rate limit history
    const rateLimitHistory = logs
      .filter(l => l.requestsLimit)
      .slice(0, 20)
      .reverse()
      .map(l => ({
        checkedAt: l.checkedAt,
        requestsLimit: l.requestsLimit,
        requestsRemaining: l.requestsRemaining,
        tokensLimit: l.tokensLimit,
        tokensRemaining: l.tokensRemaining,
      }));

    res.json({
      success: true,
      aiProvider: sanitizeProvider(aiProvider),
      stats: {
        avgLatency, p95Latency, maxLatency, minLatency,
        uptime, totalChecks: logs.length,
        successCount: successLogs.length,
        failureCount: logs.length - successLogs.length,
        totalInputTokens, totalOutputTokens, totalTokens,
      },
      trend,
      rateLimitHistory,
      logs: logs.slice(0, 50),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Compare multiple AI Providers
// @route   GET /api/ai-usage/compare?ids=id1,id2,id3
// @access  Private
const compareAIProviders = async (req, res, next) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean).slice(0, 5);
    if (!ids.length) {
      return res.status(400).json({ success: false, message: 'Provide provider IDs in ?ids= param' });
    }

    const providers = await AIProvider.find({ _id: { $in: ids }, userId: req.user._id });

    const comparisonData = await Promise.all(providers.map(async (p) => {
      const logs = await AIUsageLog.find({ aiProviderId: p._id })
        .sort({ checkedAt: -1 })
        .limit(100)
        .select('success responseTime totalTokens inputTokens outputTokens checkedAt statusCode');

      const successLogs = logs.filter(l => l.success);
      const avgLatency = successLogs.length
        ? Math.round(successLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / successLogs.length)
        : null;
      const availabilityPct = logs.length
        ? Math.round((successLogs.length / logs.length) * 100 * 10) / 10
        : 100;
      const totalTokens = logs.reduce((s, l) => s + (l.totalTokens || 0), 0);

      // Last 7 days trend
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentLogs = await AIUsageLog.find({
        aiProviderId: p._id,
        checkedAt: { $gte: sevenDaysAgo },
      }).sort({ checkedAt: 1 }).select('responseTime success checkedAt totalTokens');

      return {
        _id: p._id,
        providerName: p.providerName,
        providerType: p.providerType,
        model: p.model,
        lastStatus: p.lastStatus,
        healthScore: p.healthScore,
        healthGrade: p.healthGrade,
        uptimePercentage: p.uptimePercentage,
        avgLatency,
        availabilityPct,
        totalTokens,
        totalChecks: logs.length,
        successCount: successLogs.length,
        failureCount: logs.length - successLogs.length,
        errorRate: logs.length ? Math.round(((logs.length - successLogs.length) / logs.length) * 100 * 10) / 10 : 0,
        recentLogs: recentLogs.map(l => ({
          checkedAt: l.checkedAt,
          responseTime: l.responseTime,
          success: l.success,
          totalTokens: l.totalTokens,
        })),
      };
    }));

    res.json({ success: true, comparison: comparisonData });
  } catch (error) {
    next(error);
  }
};

// @desc    Get OpenAI organization usage (requires admin key)
// @route   GET /api/ai-usage/openai?providerId=...&startTime=...&endTime=...
// @access  Private
const getOpenAIUsageData = async (req, res, next) => {
  try {
    const { providerId, startTime, endTime } = req.query;

    // Find provider
    const provider = await AIProvider.findOne({
      _id: providerId,
      userId: req.user._id,
      providerType: 'openai',
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'OpenAI provider not found',
      });
    }

    if (!provider.encryptedAdminKey) {
      return res.json({
        success: true,
        available: false,
        reason: 'USAGE_API_UNAVAILABLE',
        message: 'Usage monitoring requires an OpenAI Admin Key. Add your Admin Key to this provider configuration.',
      });
    }

    const adminKey = decrypt(provider.encryptedAdminKey);
    if (!adminKey) {
      return res.json({
        success: true,
        available: false,
        reason: 'USAGE_API_UNAVAILABLE',
        message: 'Failed to decrypt Admin Key.',
      });
    }

    const [usageResult, costsResult] = await Promise.all([
      getUsage({ adminKey, baseUrl: provider.baseUrl, startTime, endTime }),
      getCosts({ adminKey, baseUrl: provider.baseUrl, startTime, endTime }),
    ]);

    res.json({
      success: true,
      usage: usageResult,
      costs: costsResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export AI monitoring logs as CSV
// @route   GET /api/ai-usage/export-csv?days=7&providerId=...
// @access  Private
const exportAICSV = async (req, res, next) => {
  try {
    const { providerId, days = 7 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const query = { userId: req.user._id, checkedAt: { $gte: since } };
    if (providerId) query.aiProviderId = providerId;

    const logs = await AIUsageLog.find(query)
      .sort({ checkedAt: -1 })
      .limit(5000)
      .populate('aiProviderId', 'providerName providerType model');

    const headers = [
      'Timestamp', 'Provider Name', 'Provider Type', 'Model',
      'Status Code', 'Response Time (ms)', 'Success',
      'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cached Tokens',
      'Requests Limit', 'Requests Remaining',
      'Tokens Limit', 'Tokens Remaining',
      'Cost', 'Currency', 'Cost Source',
      'Error Type', 'Error Message',
    ];

    const rows = logs.map(log => [
      log.checkedAt ? new Date(log.checkedAt).toISOString() : '',
      log.aiProviderId?.providerName || log.providerName || '',
      log.provider || '',
      log.model || '',
      log.statusCode || '',
      log.responseTime || '',
      log.success ? 'Yes' : 'No',
      log.inputTokens ?? '',
      log.outputTokens ?? '',
      log.totalTokens ?? '',
      log.cachedTokens ?? '',
      log.requestsLimit ?? '',
      log.requestsRemaining ?? '',
      log.tokensLimit ?? '',
      log.tokensRemaining ?? '',
      log.cost ?? '',
      log.currency || '',
      log.costSource || '',
      log.errorType || '',
      log.errorMessage || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ai-provider-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAIOverview,
  getAIProviderAnalytics,
  compareAIProviders,
  getOpenAIUsageData,
  exportAICSV,
};
