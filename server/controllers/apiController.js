const Api = require('../models/Api');
const Log = require('../models/Log');

// @desc    Create API endpoint
// @route   POST /api/apis
// @access  Private
const createApi = async (req, res, next) => {
  try {
    const { apiName, apiUrl, method, expectedStatus, timeout, interval, description, headers, tags } = req.body;

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

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      apis,
    });
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
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }
    res.json({ success: true, api });
  } catch (error) {
    next(error);
  }
};

// @desc    Update API
// @route   PUT /api/apis/:id
// @access  Private
const updateApi = async (req, res, next) => {
  try {
    const api = await Api.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

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
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    // Delete all logs for this API
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
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }
    api.active = !api.active;
    await api.save();
    res.json({ success: true, message: `API ${api.active ? 'activated' : 'deactivated'}`, api });
  } catch (error) {
    next(error);
  }
};

module.exports = { createApi, getApis, getApi, updateApi, deleteApi, toggleApi };
