const AIProvider = require('../models/AIProvider');
const AIUsageLog = require('../models/AIUsageLog');
const Alert = require('../models/Alert');
const { encrypt } = require('../utils/encryption');
const { testAIProviderNow, checkAIProvider } = require('../services/aiMonitorService');
const { getProviderCapabilities } = require('../services/aiProviders/providerFactory');

/**
 * Encrypt AI provider credentials from request body.
 * Only re-encrypts a field if a new value is provided.
 * Preserves existing encrypted value otherwise.
 */
const encryptCredentials = (body, existingProvider = null) => {
  const result = {};

  if (body.apiKey !== undefined && body.apiKey !== null && body.apiKey !== '') {
    result.encryptedApiKey = encrypt(body.apiKey);
  } else if (existingProvider) {
    result.encryptedApiKey = existingProvider.encryptedApiKey; // keep existing
  }

  if (body.adminKey !== undefined && body.adminKey !== null && body.adminKey !== '') {
    result.encryptedAdminKey = encrypt(body.adminKey);
  } else if (existingProvider) {
    result.encryptedAdminKey = existingProvider.encryptedAdminKey; // keep existing
  }

  return result;
};

/**
 * Strip sensitive encrypted fields from the response object.
 * API keys are NEVER returned to the frontend.
 */
const sanitizeProvider = (providerDoc) => {
  const obj = providerDoc.toObject ? providerDoc.toObject() : { ...providerDoc };
  delete obj.encryptedApiKey;
  delete obj.encryptedAdminKey;
  // Add a flag indicating whether credentials are configured
  obj.hasApiKey = !!(providerDoc.encryptedApiKey);
  obj.hasAdminKey = !!(providerDoc.encryptedAdminKey);
  obj.capabilities = getProviderCapabilities(obj.providerType);
  return obj;
};

// @desc    Create AI Provider
// @route   POST /api/ai-providers
// @access  Private
const createAIProvider = async (req, res, next) => {
  try {
    const {
      providerName, providerType, description,
      baseUrl, model, authType, authHeaderName,
      apiKey, adminKey,
      organizationId, projectId,
      monitoringEnabled, interval, timeout, expectedStatus,
      checkStrategy, customCheckUrl, customCheckMethod, customCheckBody,
      monthlyBudget, alertThreshold, latencyAlertMs, availabilityAlertPct,
    } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API key is required' });
    }

    const credentials = encryptCredentials({ apiKey, adminKey });

    const aiProvider = await AIProvider.create({
      userId: req.user._id,
      providerName,
      providerType,
      description: description || '',
      baseUrl: baseUrl || null,
      model: model || null,
      authType: authType || 'bearer',
      authHeaderName: authHeaderName || 'Authorization',
      ...credentials,
      organizationId: organizationId || null,
      projectId: projectId || null,
      monitoringEnabled: monitoringEnabled !== false,
      interval: interval || 5,
      timeout: timeout || 10000,
      expectedStatus: expectedStatus || 200,
      checkStrategy: checkStrategy || 'models_list',
      customCheckUrl: customCheckUrl || null,
      customCheckMethod: customCheckMethod || 'GET',
      customCheckBody: customCheckBody || null,
      monthlyBudget: monthlyBudget || null,
      alertThreshold: alertThreshold || null,
      latencyAlertMs: latencyAlertMs || 5000,
      availabilityAlertPct: availabilityAlertPct || 95,
    });

    // Automatically trigger initial AI health check in background
    checkAIProvider(aiProvider).catch(err => console.error('Initial AI auto-check error:', err.message));

    res.status(201).json({
      success: true,
      message: 'AI Provider added successfully',
      aiProvider: sanitizeProvider(aiProvider),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all AI Providers for user
// @route   GET /api/ai-providers
// @access  Private
const getAIProviders = async (req, res, next) => {
  try {
    const { search, status, providerType, page = 1, limit = 50 } = req.query;

    const query = { userId: req.user._id };

    if (search) {
      query.$or = [
        { providerName: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'active') query.monitoringEnabled = true;
    if (status === 'inactive') query.monitoringEnabled = false;
    if (status && ['healthy', 'degraded', 'down', 'unknown'].includes(status)) {
      query.lastStatus = status;
    }
    if (providerType) query.providerType = providerType;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await AIProvider.countDocuments(query);
    const providers = await AIProvider.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Automated Background Monitoring: Trigger check for any active AI provider that is due
    const now = Date.now();
    for (const p of providers) {
      if (p.monitoringEnabled) {
        const intervalMs = (p.interval || 5) * 60 * 1000;
        const lastCheck = p.lastCheckAt ? new Date(p.lastCheckAt).getTime() : 0;
        if (!p.lastCheckAt || now - lastCheck >= intervalMs) {
          checkAIProvider(p).catch(() => {});
        }
      }
    }

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      aiProviders: providers.map(sanitizeProvider),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single AI Provider
// @route   GET /api/ai-providers/:id
// @access  Private
const getAIProvider = async (req, res, next) => {
  try {
    const aiProvider = await AIProvider.findOne({ _id: req.params.id, userId: req.user._id });
    if (!aiProvider) {
      return res.status(404).json({ success: false, message: 'AI Provider not found' });
    }
    res.json({ success: true, aiProvider: sanitizeProvider(aiProvider) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update AI Provider
// @route   PUT /api/ai-providers/:id
// @access  Private
const updateAIProvider = async (req, res, next) => {
  try {
    const existingProvider = await AIProvider.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existingProvider) {
      return res.status(404).json({ success: false, message: 'AI Provider not found' });
    }

    const allowedFields = [
      'providerName', 'description', 'baseUrl', 'model',
      'authType', 'authHeaderName',
      'organizationId', 'projectId',
      'monitoringEnabled', 'interval', 'timeout', 'expectedStatus',
      'checkStrategy', 'customCheckUrl', 'customCheckMethod', 'customCheckBody',
      'monthlyBudget', 'alertThreshold', 'latencyAlertMs', 'availabilityAlertPct',
    ];

    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    // Re-encrypt credentials only if new values provided
    const credentials = encryptCredentials(req.body, existingProvider);
    Object.assign(updateData, credentials);

    const updated = await AIProvider.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'AI Provider updated', aiProvider: sanitizeProvider(updated) });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete AI Provider
// @route   DELETE /api/ai-providers/:id
// @access  Private
const deleteAIProvider = async (req, res, next) => {
  try {
    const aiProvider = await AIProvider.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!aiProvider) {
      return res.status(404).json({ success: false, message: 'AI Provider not found' });
    }
    // Cascade delete logs and alerts
    await AIUsageLog.deleteMany({ aiProviderId: req.params.id });
    await Alert.deleteMany({ apiId: req.params.id, userId: req.user._id });

    res.json({ success: true, message: 'AI Provider deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle AI Provider monitoring enabled/disabled
// @route   PATCH /api/ai-providers/:id/toggle
// @access  Private
const toggleAIProvider = async (req, res, next) => {
  try {
    const aiProvider = await AIProvider.findOne({ _id: req.params.id, userId: req.user._id });
    if (!aiProvider) {
      return res.status(404).json({ success: false, message: 'AI Provider not found' });
    }
    aiProvider.monitoringEnabled = !aiProvider.monitoringEnabled;
    await aiProvider.save();
    res.json({
      success: true,
      message: `AI Provider ${aiProvider.monitoringEnabled ? 'enabled' : 'disabled'}`,
      aiProvider: sanitizeProvider(aiProvider),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test AI Provider immediately (no DB write)
// @route   POST /api/ai-providers/:id/test
// @access  Private
const testAIProvider = async (req, res, next) => {
  try {
    const aiProvider = await AIProvider.findOne({ _id: req.params.id, userId: req.user._id });
    if (!aiProvider) {
      return res.status(404).json({ success: false, message: 'AI Provider not found' });
    }
    const result = await testAIProviderNow(aiProvider);
    if (result.success) {
      // Also log check asynchronously so metrics and recent logs update
      checkAIProvider(aiProvider).catch(e => console.error('Error logging test check:', e.message));
    }
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logs for an AI Provider
// @route   GET /api/ai-providers/:id/logs
// @access  Private
const getAIProviderLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const aiProvider = await AIProvider.findOne({ _id: req.params.id, userId: req.user._id });
    if (!aiProvider) {
      return res.status(404).json({ success: false, message: 'AI Provider not found' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await AIUsageLog.countDocuments({ aiProviderId: req.params.id });
    const logs = await AIUsageLog.find({ aiProviderId: req.params.id })
      .sort({ checkedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-selectedHeaders'); // strip headers from list view

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

module.exports = {
  createAIProvider,
  getAIProviders,
  getAIProvider,
  updateAIProvider,
  deleteAIProvider,
  toggleAIProvider,
  testAIProvider,
  getAIProviderLogs,
};
