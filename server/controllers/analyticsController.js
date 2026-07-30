const Log = require('../models/Log');
const Api = require('../models/Api');

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    // Get all user APIs
    const apis = await Api.find({ userId });
    const apiIds = apis.map(a => a._id);

    const totalApis = apis.length;
    const activeApis = apis.filter(a => a.active).length;
    const failedApis = apis.filter(a => a.lastStatus === 'down').length;

    // Today's checks
    const todayChecks = await Log.countDocuments({
      userId,
      checkedAt: { $gte: todayStart },
    });

    // Average response time (last 24h)
    const recentLogs = await Log.find({
      userId,
      success: true,
      checkedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).select('responseTime apiId');

    const avgResponseTime = recentLogs.length
      ? Math.round(recentLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / recentLogs.length)
      : 0;

    // Success vs Failure (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = await Log.find({ userId, checkedAt: { $gte: weekAgo } }).select('success checkedAt responseTime apiId');

    const successCount = weekLogs.filter(l => l.success).length;
    const failureCount = weekLogs.filter(l => !l.success).length;

    // Response time trend (last 7 days, grouped by day)
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
      const daySuccess = dayLogs.filter(l => l.success).length;
      const dayTotal = dayLogs.length;
      const dayAvgRT = dayLogs.filter(l => l.success && l.responseTime).length
        ? Math.round(dayLogs.filter(l => l.success).reduce((s, l) => s + (l.responseTime || 0), 0) / dayLogs.filter(l => l.success).length)
        : 0;

      dailyTrend.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgResponseTime: dayAvgRT,
        uptime: dayTotal > 0 ? Math.round((daySuccess / dayTotal) * 100) : 100,
        checks: dayTotal,
      });
    }

    // Fastest and Slowest APIs
    const apiPerformance = [];
    for (const api of apis) {
      const apiLogs = recentLogs.filter(l => String(l.apiId) === String(api._id));
      if (apiLogs.length > 0) {
        const avgRT = Math.round(apiLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / apiLogs.length);
        apiPerformance.push({ apiId: api._id, apiName: api.apiName, avgRT, lastStatus: api.lastStatus });
      }
    }

    apiPerformance.sort((a, b) => a.avgRT - b.avgRT);

    const fastestApi = apiPerformance[0] || null;
    const slowestApi = apiPerformance[apiPerformance.length - 1] || null;

    // Last checked
    const lastLog = await Log.findOne({ userId }).sort({ checkedAt: -1 }).select('checkedAt');

    res.json({
      success: true,
      analytics: {
        totalApis,
        activeApis,
        failedApis,
        avgResponseTime,
        todayChecks,
        lastChecked: lastLog?.checkedAt || null,
        successCount,
        failureCount,
        fastestApi,
        slowestApi,
        dailyTrend,
        apiPerformance: apiPerformance.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get API-wise performance
// @route   GET /api/analytics/api/:id
// @access  Private
const getApiAnalytics = async (req, res, next) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    const logs = await Log.find({ apiId: req.params.id })
      .sort({ checkedAt: -1 })
      .limit(200)
      .select('statusCode responseTime success checkedAt errorMessage');

    const successLogs = logs.filter(l => l.success);
    const responseTimes = successLogs.map(l => l.responseTime).filter(Boolean);

    const avgLatency = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
    const maxLatency = responseTimes.length ? Math.max(...responseTimes) : 0;
    const minLatency = responseTimes.length ? Math.min(...responseTimes) : 0;
    const uptime = logs.length > 0 ? Math.round((successLogs.length / logs.length) * 100 * 10) / 10 : 100;

    // Recent trend
    const trend = logs.slice(0, 50).reverse().map((l, i) => ({
      index: i + 1,
      responseTime: l.responseTime,
      success: l.success,
      checkedAt: l.checkedAt,
      statusCode: l.statusCode,
    }));

    res.json({
      success: true,
      api,
      stats: { avgLatency, maxLatency, minLatency, uptime, totalChecks: logs.length },
      trend,
      logs: logs.slice(0, 50),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics, getApiAnalytics };
