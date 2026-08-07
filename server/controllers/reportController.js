const Api = require('../models/Api');
const Log = require('../models/Log');

// @desc    Export logs as CSV
// @route   GET /api/reports/csv?apiId=&days=
// @access  Private
const exportCsv = async (req, res, next) => {
  try {
    const { apiId, days = 7 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const query = { userId: req.user._id, checkedAt: { $gte: since } };
    if (apiId) query.apiId = apiId;

    const logs = await Log.find(query).sort({ checkedAt: -1 }).limit(5000).populate('apiId', 'apiName apiUrl');

    const headers = [
      'API Name', 'API URL', 'Status Code', 'Response Time (ms)',
      'Success', 'Error', 'Response Size (bytes)', 'Content Type',
      'Rate Limit', 'Rate Remaining', 'Health Score', 'Checked At',
    ];

    const rows = logs.map(log => [
      log.apiId?.apiName || '',
      log.apiId?.apiUrl || '',
      log.statusCode || '',
      log.responseTime || '',
      log.success ? 'Yes' : 'No',
      log.errorMessage || '',
      log.responseSize || '',
      log.contentType || '',
      log.rateLimit?.limit || '',
      log.rateLimit?.remaining || '',
      log.healthScore || '',
      log.checkedAt ? new Date(log.checkedAt).toISOString() : '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="api-monitor-report-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Export logs as JSON (for PDF/Excel client-side)
// @route   GET /api/reports/json?apiId=&days=
// @access  Private
const exportJson = async (req, res, next) => {
  try {
    const { apiId, days = 7 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const query = { userId: req.user._id, checkedAt: { $gte: since } };
    if (apiId) query.apiId = apiId;

    const logs = await Log.find(query).sort({ checkedAt: -1 }).limit(5000).populate('apiId', 'apiName apiUrl lastStatus uptimePercentage healthScore');

    // Summary per API
    const apis = await Api.find({ userId: req.user._id });
    const summary = apis.map(api => ({
      apiName: api.apiName,
      apiUrl: api.apiUrl,
      lastStatus: api.lastStatus,
      uptimePercentage: api.uptimePercentage,
      healthScore: api.healthScore,
      healthGrade: api.healthGrade,
      sslDaysRemaining: api.sslDaysRemaining,
      quotaRemaining: api.quotaRemaining,
    }));

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      period: `Last ${days} days`,
      summary,
      logs: logs.map(l => ({
        apiName: l.apiId?.apiName,
        statusCode: l.statusCode,
        responseTime: l.responseTime,
        success: l.success,
        errorMessage: l.errorMessage,
        responseSize: l.responseSize,
        contentType: l.contentType,
        rateLimit: l.rateLimit,
        healthScore: l.healthScore,
        checkedAt: l.checkedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { exportCsv, exportJson };
