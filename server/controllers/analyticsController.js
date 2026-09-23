const Log = require('../models/Log');
const Api = require('../models/Api');
const AIProvider = require('../models/AIProvider');
const AIUsageLog = require('../models/AIUsageLog');

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    const [apis, aiProviders] = await Promise.all([
      Api.find({ userId }),
      AIProvider.find({ userId }),
    ]);

    const totalApis = apis.length + aiProviders.length;
    const activeApis = apis.filter(a => a.active).length + aiProviders.filter(p => p.monitoringEnabled).length;
    const failedApis = apis.filter(a => a.lastStatus === 'down').length + aiProviders.filter(p => p.lastStatus === 'down').length;
    const healthyApis = apis.filter(a => a.lastStatus === 'healthy').length + aiProviders.filter(p => p.lastStatus === 'healthy').length;
    const sslWarnings = apis.filter(a => a.sslDaysRemaining !== null && a.sslDaysRemaining <= 30).length;

    const apisWithQuota = apis.filter(a => a.quotaLimit && a.quotaRemaining !== null);
    const totalQuotaRemaining = apisWithQuota.reduce((s, a) => s + (a.quotaRemaining || 0), 0);

    const [todayChecksStandard, todayChecksAI] = await Promise.all([
      Log.countDocuments({ userId, checkedAt: { $gte: todayStart } }),
      AIUsageLog.countDocuments({ userId, checkedAt: { $gte: todayStart } }),
    ]);
    const todayChecks = todayChecksStandard + todayChecksAI;

    const allScored = [
      ...apis.filter(a => a.healthScore !== null).map(a => a.healthScore),
      ...aiProviders.filter(p => p.healthScore !== null).map(p => p.healthScore),
    ];
    const avgHealthScore = allScored.length
      ? Math.round(allScored.reduce((s, score) => s + score, 0) / allScored.length)
      : null;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentStandardLogs, recentAILogs] = await Promise.all([
      Log.find({ userId, success: true, checkedAt: { $gte: since24h } })
        .select('responseTime apiId responseSize checkedAt success'),
      AIUsageLog.find({ userId, success: true, checkedAt: { $gte: since24h } })
        .select('responseTime aiProviderId responseSize checkedAt success'),
    ]);

    const recentLogs = [
      ...recentStandardLogs.map(l => ({ responseTime: l.responseTime, apiId: String(l.apiId), responseSize: l.responseSize, checkedAt: l.checkedAt, success: l.success })),
      ...recentAILogs.map(l => ({ responseTime: l.responseTime, apiId: String(l.aiProviderId), responseSize: l.responseSize, checkedAt: l.checkedAt, success: l.success })),
    ];

    const avgResponseTime = recentLogs.length
      ? Math.round(recentLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / recentLogs.length)
      : 0;

    const allUptimes = [
      ...apis.map(a => a.uptimePercentage || 0),
      ...aiProviders.map(p => p.uptimePercentage || 0),
    ];
    const avgAvailability = allUptimes.length
      ? Math.round(allUptimes.reduce((s, u) => s + u, 0) / allUptimes.length * 10) / 10
      : 0;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [weekStandardLogs, weekAILogs] = await Promise.all([
      Log.find({ userId, checkedAt: { $gte: weekAgo } })
        .select('success checkedAt responseTime apiId responseSize rateLimit healthScore'),
      AIUsageLog.find({ userId, checkedAt: { $gte: weekAgo } })
        .select('success checkedAt responseTime aiProviderId responseSize rateLimits'),
    ]);

    const weekLogs = [
      ...weekStandardLogs.map(l => ({ ...l.toObject(), apiId: String(l.apiId) })),
      ...weekAILogs.map(l => ({ ...l.toObject(), apiId: String(l.aiProviderId) })),
    ];

    const successCount = weekLogs.filter(l => l.success).length;
    const failureCount = weekLogs.filter(l => !l.success).length;

    // Daily trend (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayLogs = weekLogs.filter(l => new Date(l.checkedAt) >= dayStart && new Date(l.checkedAt) <= dayEnd);
      const daySuccess = dayLogs.filter(l => l.success);
      const dayAvgRT = daySuccess.length
        ? Math.round(daySuccess.reduce((s, l) => s + (l.responseTime || 0), 0) / daySuccess.length) : 0;
      const dayAvgSize = daySuccess.filter(l => l.responseSize).length
        ? Math.round(daySuccess.filter(l => l.responseSize).reduce((s, l) => s + l.responseSize, 0) / daySuccess.filter(l => l.responseSize).length) : 0;
      dailyTrend.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgResponseTime: dayAvgRT,
        uptime: dayLogs.length > 0 ? Math.round((daySuccess.length / dayLogs.length) * 100) : 100,
        checks: dayLogs.length,
        avgSize: dayAvgSize,
      });
    }

    // Weekly performance (last 4 weeks)
    const weeklyPerformance = [];
    for (let i = 3; i >= 0; i--) {
      const wStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const [wStandard, wAI] = await Promise.all([
        Log.find({ userId, checkedAt: { $gte: wStart, $lte: wEnd } }).select('success responseTime'),
        AIUsageLog.find({ userId, checkedAt: { $gte: wStart, $lte: wEnd } }).select('success responseTime'),
      ]);
      const wLogs = [...wStandard, ...wAI];
      const wSuccess = wLogs.filter(l => l.success);
      weeklyPerformance.push({
        week: `Week ${4 - i}`,
        uptime: wLogs.length ? Math.round((wSuccess.length / wLogs.length) * 100) : 100,
        avgResponseTime: wSuccess.length ? Math.round(wSuccess.reduce((s, l) => s + (l.responseTime || 0), 0) / wSuccess.length) : 0,
        checks: wLogs.length,
      });
    }

    // Monthly availability (last 6 months)
    const monthlyAvailability = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date();
      mStart.setMonth(mStart.getMonth() - i);
      mStart.setDate(1);
      mStart.setHours(0, 0, 0, 0);
      const mEnd = new Date(mStart);
      mEnd.setMonth(mEnd.getMonth() + 1);
      const [mStandard, mAI] = await Promise.all([
        Log.find({ userId, checkedAt: { $gte: mStart, $lte: mEnd } }).select('success'),
        AIUsageLog.find({ userId, checkedAt: { $gte: mStart, $lte: mEnd } }).select('success'),
      ]);
      const mLogs = [...mStandard, ...mAI];
      const mSuccess = mLogs.filter(l => l.success);
      monthlyAvailability.push({
        month: mStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        availability: mLogs.length ? Math.round((mSuccess.length / mLogs.length) * 100 * 10) / 10 : 100,
        checks: mLogs.length,
      });
    }

    // Fastest and Slowest APIs (both REST and AI)
    const apiPerformance = [];
    for (const api of apis) {
      const apiLogs = recentLogs.filter(l => l.apiId === String(api._id));
      if (apiLogs.length > 0) {
        const avgRT = Math.round(apiLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / apiLogs.length);
        apiPerformance.push({ apiId: api._id, apiName: api.apiName, avgRT, lastStatus: api.lastStatus, healthScore: api.healthScore, isAI: false });
      }
    }
    for (const provider of aiProviders) {
      const providerLogs = recentLogs.filter(l => l.apiId === String(provider._id));
      if (providerLogs.length > 0) {
        const avgRT = Math.round(providerLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / providerLogs.length);
        apiPerformance.push({ apiId: provider._id, apiName: provider.providerName, avgRT, lastStatus: provider.lastStatus, healthScore: provider.healthScore, isAI: true });
      } else if (provider.lastResponseTime) {
        apiPerformance.push({ apiId: provider._id, apiName: provider.providerName, avgRT: provider.lastResponseTime, lastStatus: provider.lastStatus, healthScore: provider.healthScore, isAI: true });
      }
    }
    apiPerformance.sort((a, b) => a.avgRT - b.avgRT);

    // Calculate p95 and p99
    const sortedTimes = recentLogs.map(l => l.responseTime).filter(t => t !== null && t !== undefined).sort((a, b) => a - b);
    const p95Idx = Math.floor(sortedTimes.length * 0.95);
    const p99Idx = Math.floor(sortedTimes.length * 0.99);
    const p95ResponseTime = sortedTimes.length ? sortedTimes[p95Idx] || sortedTimes[sortedTimes.length - 1] : 0;
    const p99ResponseTime = sortedTimes.length ? sortedTimes[p99Idx] || sortedTimes[sortedTimes.length - 1] : 0;

    const [lastLogStandard, lastLogAI] = await Promise.all([
      Log.findOne({ userId }).sort({ checkedAt: -1 }).select('checkedAt'),
      AIUsageLog.findOne({ userId }).sort({ checkedAt: -1 }).select('checkedAt'),
    ]);
    const latestCheck = [lastLogStandard?.checkedAt, lastLogAI?.checkedAt].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] || null;

    res.json({
      success: true,
      analytics: {
        totalApis, activeApis, failedApis, healthyApis,
        avgResponseTime, p95ResponseTime, p99ResponseTime, todayChecks, avgHealthScore,
        avgAvailability, sslWarnings, totalQuotaRemaining,
        lastChecked: latestCheck,
        successCount, failureCount,
        fastestApi: apiPerformance[0] || null,
        slowestApi: apiPerformance[apiPerformance.length - 1] || null,
        dailyTrend, weeklyPerformance, monthlyAvailability,
        apiPerformance: apiPerformance.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get API-wise performance (supports both standard APIs and AI providers)
// @route   GET /api/analytics/api/:id
// @access  Private
const getApiAnalytics = async (req, res, next) => {
  try {
    let api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    let isAI = false;

    if (!api) {
      const aiProvider = await AIProvider.findOne({ _id: req.params.id, userId: req.user._id });
      if (!aiProvider) return res.status(404).json({ success: false, message: 'API not found' });
      isAI = true;
      api = {
        _id: aiProvider._id,
        apiName: aiProvider.providerName,
        apiUrl: aiProvider.baseUrl || 'https://api.openai.com/v1/models',
        method: 'AI',
        lastStatus: aiProvider.lastStatus || 'healthy',
        uptimePercentage: aiProvider.uptimePercentage || 100,
        healthScore: aiProvider.healthScore,
        toObject: () => ({
          _id: aiProvider._id,
          apiName: aiProvider.providerName,
          apiUrl: aiProvider.baseUrl || 'https://api.openai.com/v1/models',
          method: 'AI',
          lastStatus: aiProvider.lastStatus || 'healthy',
          uptimePercentage: aiProvider.uptimePercentage || 100,
          healthScore: aiProvider.healthScore,
        }),
      };
    }

    const safeApi = api.toObject();
    if (safeApi.authentication) {
      safeApi.authentication = { type: safeApi.authentication.type };
    }

    let logs = [];
    if (isAI) {
      const aiLogs = await AIUsageLog.find({ aiProviderId: req.params.id })
        .sort({ checkedAt: -1 })
        .limit(200);
      logs = aiLogs.map(l => ({
        statusCode: l.statusCode,
        responseTime: l.responseTime,
        success: l.success,
        checkedAt: l.checkedAt,
        errorMessage: l.errorMessage,
        responseSize: l.responseSize,
        healthScore: null,
      }));
    } else {
      logs = await Log.find({ apiId: req.params.id })
        .sort({ checkedAt: -1 })
        .limit(200)
        .select('statusCode responseTime success checkedAt errorMessage responseSize contentType rateLimit healthScore responseHeaders errorPayload');
    }

    const successLogs = logs.filter(l => l.success);
    const responseTimes = successLogs.map(l => l.responseTime).filter(Boolean).sort((a, b) => a - b);

    const avgLatency = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
    const maxLatency = responseTimes.length ? Math.max(...responseTimes) : 0;
    const minLatency = responseTimes.length ? Math.min(...responseTimes) : 0;
    const p95Latency = responseTimes.length ? responseTimes[Math.floor(responseTimes.length * 0.95)] || responseTimes[responseTimes.length - 1] : 0;
    const p99Latency = responseTimes.length ? responseTimes[Math.floor(responseTimes.length * 0.99)] || responseTimes[responseTimes.length - 1] : 0;
    const uptime = logs.length > 0 ? Math.round((successLogs.length / logs.length) * 100 * 10) / 10 : 100;

    const sizeTrend = successLogs.filter(l => l.responseSize).slice(0, 50).reverse().map((l, i) => ({
      index: i + 1, size: l.responseSize, checkedAt: l.checkedAt,
    }));

    const quotaHistory = logs.filter(l => l.rateLimit?.limit).slice(0, 20).reverse().map(l => ({
      checkedAt: l.checkedAt,
      limit: l.rateLimit.limit,
      remaining: l.rateLimit.remaining,
      used: l.rateLimit.used,
    }));

    const trend = logs.slice(0, 50).reverse().map((l, i) => ({
      index: i + 1,
      responseTime: l.responseTime,
      success: l.success,
      checkedAt: l.checkedAt,
      statusCode: l.statusCode,
      responseSize: l.responseSize,
      healthScore: l.healthScore,
    }));

    const latestLog = logs[0];
    const latestHeaders = latestLog?.responseHeaders ? Object.fromEntries(latestLog.responseHeaders) : {};

    res.json({
      success: true,
      api: safeApi,
      stats: { avgLatency, p95Latency, p99Latency, maxLatency, minLatency, uptime, totalChecks: logs.length },
      trend, sizeTrend, quotaHistory, latestHeaders,
      logs: logs.slice(0, 50),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics, getApiAnalytics };
