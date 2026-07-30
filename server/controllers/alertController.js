const Alert = require('../models/Alert');

// @desc    Get alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res, next) => {
  try {
    const { resolved, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user._id };

    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('apiId', 'apiName apiUrl');

    const unreadCount = await Alert.countDocuments({ userId: req.user._id, resolved: false });

    res.json({ success: true, total, unreadCount, page: Number(page), pages: Math.ceil(total / Number(limit)), alerts });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve alert
// @route   PUT /api/alerts/:id
// @access  Private
const resolveAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, message: 'Alert resolved', alert });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve all alerts
// @route   PUT /api/alerts/resolve-all
// @access  Private
const resolveAllAlerts = async (req, res, next) => {
  try {
    await Alert.updateMany(
      { userId: req.user._id, resolved: false },
      { resolved: true, resolvedAt: new Date() }
    );
    res.json({ success: true, message: 'All alerts resolved' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
// @access  Private
const deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAlerts, resolveAlert, resolveAllAlerts, deleteAlert };
