const cron = require('node-cron');
const Api = require('../models/Api');
const { checkApi } = require('../services/monitorService');
const AIProvider = require('../models/AIProvider');
const { checkAIProvider } = require('../services/aiMonitorService');

// Track which APIs were last checked to respect intervals
const lastChecked = new Map();
// Track which AI providers were last checked
const lastAIChecked = new Map();

/**
 * Start the monitoring scheduler
 * Runs every minute and checks which APIs are due for a check
 */
const startScheduler = () => {
  console.log('⏰ Monitoring scheduler started');

  // Main scheduler: runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const apis = await Api.find({ active: true });
      const now = Date.now();

      for (const api of apis) {
        const lastCheck = lastChecked.get(String(api._id));
        const intervalMs = api.interval * 60 * 1000;

        // Check if interval has passed since last check
        if (!lastCheck || now - lastCheck >= intervalMs) {
          lastChecked.set(String(api._id), now);
          // Check API asynchronously (don't await, avoid blocking)
          checkApi(api).catch(err => {
            console.error(`Error checking ${api.apiName}:`, err.message);
          });
        }
      }
    } catch (error) {
      console.error('Scheduler error:', error.message);
    }
  });

  // AI Provider monitoring — same tick, separate tracking
  cron.schedule('* * * * *', async () => {
    try {
      const aiProviders = await AIProvider.find({ monitoringEnabled: true });
      const now = Date.now();

      for (const provider of aiProviders) {
        const lastCheck = lastAIChecked.get(String(provider._id));
        const intervalMs = provider.interval * 60 * 1000;

        if (!lastCheck || now - lastCheck >= intervalMs) {
          lastAIChecked.set(String(provider._id), now);
          checkAIProvider(provider).catch(err => {
            console.error(`Error checking AI provider ${provider.providerName}:`, err.message);
          });
        }
      }
    } catch (error) {
      console.error('AI Scheduler error:', error.message);
    }
  });

  // Cleanup: remove entries for deleted APIs and AI providers every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const activeIds = (await Api.find({ active: true }).select('_id')).map(a => String(a._id));
      for (const [id] of lastChecked) {
        if (!activeIds.includes(id)) {
          lastChecked.delete(id);
        }
      }

      const activeAIIds = (await AIProvider.find({ monitoringEnabled: true }).select('_id')).map(p => String(p._id));
      for (const [id] of lastAIChecked) {
        if (!activeAIIds.includes(id)) {
          lastAIChecked.delete(id);
        }
      }
    } catch (err) {
      console.error('Scheduler cleanup error:', err.message);
    }
  });
};

module.exports = startScheduler;
