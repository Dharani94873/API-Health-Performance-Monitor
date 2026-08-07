const Api = require('../models/Api');
const Log = require('../models/Log');
const { encrypt } = require('../utils/encryption');
const { testApiNow } = require('../services/monitorService');
const { checkSSL } = require('../services/sslService');

/**
 * Encrypt authentication credentials before storing
 */
const encryptAuth = (authentication) => {
  if (!authentication || authentication.type === 'none') {
    return { type: 'none' };
  }

  const encrypted = { type: authentication.type };

  switch (authentication.type) {
    case 'apiKey':
      encrypted.apiKeyEncrypted = encrypt(authentication.apiKey || '');
      encrypted.apiKeyHeader = authentication.apiKeyHeader || 'X-API-Key';
      encrypted.apiKeyLocation = authentication.apiKeyLocation || 'header';
      break;
    case 'bearer':
      encrypted.bearerTokenEncrypted = encrypt(authentication.bearerToken || '');
      break;
    case 'basic':
      encrypted.basicUsernameEncrypted = encrypt(authentication.username || '');
      encrypted.basicPasswordEncrypted = encrypt(authentication.password || '');
      break;
    case 'custom':
      encrypted.customHeadersEncrypted = encrypt(JSON.stringify(authentication.customHeaders || {}));
      break;
  }

  return encrypted;
};

// @desc    Create API endpoint
// @route   POST /api/apis
// @access  Private
const createApi = async (req, res, next) => {
  try {
    const {
      apiName, apiUrl, method, expectedStatus, timeout, interval,
      description, headers, tags, authentication, requestBody,
    } = req.body;

    const api = await Api.create({
      userId: req.user._id,
      apiName,
      apiUrl,
      method: method || 'GET',
      expectedStatus: expectedStatus || 200,
      timeout: timeout || 5000,
      interval: interval || 5,
      description,
      headers,
      tags,
      requestBody: requestBody || null,
      authentication: authentication ? encryptAuth(authentication) : { type: 'none' },
    });

    res.status(201).json({ success: true, message: 'API added successfully', api });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all APIs for user
// @route   GET /api/apis
// @access  Private
const getApis = async (req, res, next) => {
  try {
    const { search, status, sort = '-createdAt', page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };

    if (search) {
      query.$or = [
        { apiName: { $regex: search, $options: 'i' } },
        { apiUrl: { $regex: search, $options: 'i' } },
      ];
    }

    if (status === 'active') query.active = true;
    if (status === 'inactive') query.active = false;
    if (status === 'healthy') query.lastStatus = 'healthy';
    if (status === 'down') query.lastStatus = 'down';

    let sortQuery = {};
    if (sort === '-createdAt') sortQuery = { createdAt: -1 };
    if (sort === 'createdAt') sortQuery = { createdAt: 1 };
    if (sort === 'fastest') sortQuery = { uptimePercentage: -1 };
    if (sort === 'slowest') sortQuery = { uptimePercentage: 1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Api.countDocuments(query);
    const apis = await Api.find(query).sort(sortQuery).skip(skip).limit(Number(limit));

    // Strip sensitive encrypted fields from response
    const safeApis = apis.map(a => {
      const obj = a.toObject();
      if (obj.authentication) {
        obj.authentication = { type: obj.authentication.type };
      }
      return obj;
    });

    res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / Number(limit)), apis: safeApis });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single API
// @route   GET /api/apis/:id
// @access  Private
const getApi = async (req, res, next) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });

    const obj = api.toObject();
    if (obj.authentication) obj.authentication = { type: obj.authentication.type };

    res.json({ success: true, api: obj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update API
// @route   PUT /api/apis/:id
// @access  Private
const updateApi = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    if (updateData.authentication) {
      updateData.authentication = encryptAuth(updateData.authentication);
    }

    const api = await Api.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!api) return res.status(404).json({ success: false, message: 'API not found' });

    res.json({ success: true, message: 'API updated', api });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete API
// @route   DELETE /api/apis/:id
// @access  Private
const deleteApi = async (req, res, next) => {
  try {
    const api = await Api.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });

    await Log.deleteMany({ apiId: req.params.id });

    res.json({ success: true, message: 'API deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle API active state
// @route   PATCH /api/apis/:id/toggle
// @access  Private
const toggleApi = async (req, res, next) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });
    api.active = !api.active;
    await api.save();
    res.json({ success: true, message: `API ${api.active ? 'activated' : 'deactivated'}`, api });
  } catch (error) {
    next(error);
  }
};

// @desc    Immediately test an API (Feature 12)
// @route   POST /api/apis/:id/test
// @access  Private
const testApi = async (req, res, next) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });

    const result = await testApiNow(api);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

// @desc    Compare multiple APIs (Feature 10)
// @route   GET /api/apis/compare?ids=id1,id2,id3
// @access  Private
const compareApis = async (req, res, next) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean).slice(0, 5);
    if (!ids.length) return res.status(400).json({ success: false, message: 'Provide API IDs in ?ids= param' });

    const apis = await Api.find({ _id: { $in: ids }, userId: req.user._id });

    const comparisonData = await Promise.all(apis.map(async (api) => {
      const logs = await Log.find({ apiId: api._id }).sort({ checkedAt: -1 }).limit(100);
      const successLogs = logs.filter(l => l.success);
      const avgResponseTime = successLogs.length
        ? Math.round(successLogs.reduce((s, l) => s + (l.responseTime || 0), 0) / successLogs.length)
        : null;
      const successRate = logs.length ? Math.round((successLogs.length / logs.length) * 100) : 0;
      const failures = logs.filter(l => !l.success).length;

      // Last 7 days daily data
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentLogs = await Log.find({ apiId: api._id, checkedAt: { $gte: sevenDaysAgo } }).sort({ checkedAt: 1 });

      return {
        _id: api._id,
        apiName: api.apiName,
        apiUrl: api.apiUrl,
        lastStatus: api.lastStatus,
        uptimePercentage: api.uptimePercentage,
        healthScore: api.healthScore,
        healthGrade: api.healthGrade,
        avgResponseTime,
        successRate,
        failures,
        totalChecks: logs.length,
        quotaLimit: api.quotaLimit,
        quotaRemaining: api.quotaRemaining,
        recentLogs: recentLogs.map(l => ({
          checkedAt: l.checkedAt,
          responseTime: l.responseTime,
          success: l.success,
          statusCode: l.statusCode,
        })),
      };
    }));

    res.json({ success: true, comparison: comparisonData });
  } catch (error) {
    next(error);
  }
};

// @desc    Get SSL info for an API (Feature 4)
// @route   GET /api/apis/:id/ssl
// @access  Private
const getApiSSL = async (req, res, next) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });

    const sslInfo = await checkSSL(api.apiUrl);
    res.json({ success: true, ssl: sslInfo });
  } catch (error) {
    next(error);
  }
};

module.exports = { createApi, getApis, getApi, updateApi, deleteApi, toggleApi, testApi, compareApis, getApiSSL };
