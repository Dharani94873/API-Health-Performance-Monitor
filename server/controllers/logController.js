const Log = require('../models/Log');
const Api = require('../models/Api');

// @desc    Get logs for an API
// @route   GET /api/logs/:apiId
// @access  Private
const getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, from, to } = req.query;
    const api = await Api.findOne({ _id: req.params.apiId, userId: req.user._id });
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    const query = { apiId: req.params.apiId };
    if (from || to) {
      query.checkedAt = {};
      if (from) query.checkedAt.$gte = new Date(from);
      if (to) query.checkedAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Log.countDocuments(query);
    const logs = await Log.find(query).sort({ checkedAt: -1 }).skip(skip).limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      logs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent logs (all APIs for user)
// @route   GET /api/logs
// @access  Private
const getRecentLogs = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await Log.find({ userId: req.user._id })
      .sort({ checkedAt: -1 })
      .limit(Number(limit))
      .populate('apiId', 'apiName apiUrl method');

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Export logs as CSV data
// @route   GET /api/logs/:apiId/export
// @access  Private
const exportLogs = async (req, res, next) => {
  try {
    const api = await Api.findOne({ _id: req.params.apiId, userId: req.user._id });
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    const logs = await Log.find({ apiId: req.params.apiId }).sort({ checkedAt: -1 }).limit(1000);

    const csvRows = [
      ['Checked At', 'Status Code', 'Response Time (ms)', 'Success', 'Error'],
      ...logs.map(log => [
        new Date(log.checkedAt).toISOString(),
        log.statusCode || 'N/A',
        log.responseTime || 'N/A',
        log.success ? 'Yes' : 'No',
        log.errorMessage || '',
      ]),
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${api.apiName}-logs.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = { getLogs, getRecentLogs, exportLogs };
