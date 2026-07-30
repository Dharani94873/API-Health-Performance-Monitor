const axios = require('axios');
const Api = require('../models/Api');
const Log = require('../models/Log');
const Alert = require('../models/Alert');
const { sendAlertEmail } = require('../config/email');
const User = require('../models/User');

/**
 * Check a single API and store the result
 */
const checkApi = async (api) => {
  const startTime = Date.now();
  let logData = {
    apiId: api._id,
    userId: api.userId,
    success: false,
    checkedAt: new Date(),
  };

  try {
    const response = await axios({
      method: api.method.toLowerCase(),
      url: api.apiUrl,
      timeout: api.timeout,
      headers: api.headers ? Object.fromEntries(api.headers) : {},
      validateStatus: () => true, // Don't throw on any status
    });

    const responseTime = Date.now() - startTime;
    const success = response.status === api.expectedStatus;

    logData = {
      ...logData,
      statusCode: response.status,
      responseTime,
      success,
      responseSize: JSON.stringify(response.data).length,
      errorMessage: success ? null : `Expected ${api.expectedStatus}, got ${response.status}`,
    };

    // Update API lastStatus
    let newStatus = 'healthy';
    if (!success) {
      newStatus = 'down';
    } else if (responseTime > 3000) {
      newStatus = 'degraded';
    }

    await Api.findByIdAndUpdate(api._id, {
      lastChecked: new Date(),
      lastStatus: newStatus,
    });

    // Create alert on failure
    if (!success) {
      await createAlert(api, `Status ${response.status} (expected ${api.expectedStatus})`, 'status_mismatch', response.status);
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage = error.message;
    let alertType = 'down';

    if (error.code === 'ECONNABORTED') {
      errorMessage = `Timeout after ${api.timeout}ms`;
      alertType = 'timeout';
    }

    logData = {
      ...logData,
      statusCode: null,
      responseTime,
      success: false,
      errorMessage,
    };

    await Api.findByIdAndUpdate(api._id, {
      lastChecked: new Date(),
      lastStatus: 'down',
    });

    await createAlert(api, errorMessage, alertType, null);
  }

  // Save log
  await Log.create(logData);

  // Update uptime percentage
  await updateUptimePercentage(api._id);
};

/**
 * Create alert and optionally send email
 */
const createAlert = async (api, message, type, statusCode) => {
  try {
    // Avoid duplicate alerts (check if same type alert in last 30 minutes)
    const recentAlert = await Alert.findOne({
      apiId: api._id,
      type,
      resolved: false,
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
    });

    if (recentAlert) return; // Suppress duplicate

    const alert = await Alert.create({
      apiId: api._id,
      userId: api.userId,
      message: `${api.apiName}: ${message}`,
      type,
      statusCode,
    });

    // Send email notification
    if (process.env.EMAIL_USER) {
      try {
        const user = await User.findById(api.userId);
        if (user && user.emailNotifications) {
          const sent = await sendAlertEmail({
            to: user.email,
            apiName: api.apiName,
            message,
            timestamp: alert.createdAt,
          });
          if (sent) {
            await Alert.findByIdAndUpdate(alert._id, { emailSent: true });
          }
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError.message);
      }
    }
  } catch (error) {
    console.error('Alert creation error:', error.message);
  }
};

/**
 * Update uptime percentage based on last 100 logs
 */
const updateUptimePercentage = async (apiId) => {
  try {
    const logs = await Log.find({ apiId }).sort({ checkedAt: -1 }).limit(100);
    if (!logs.length) return;
    const uptime = Math.round((logs.filter(l => l.success).length / logs.length) * 1000) / 10;
    await Api.findByIdAndUpdate(apiId, { uptimePercentage: uptime });
  } catch (error) {
    console.error('Uptime update error:', error.message);
  }
};

module.exports = { checkApi };
