const express = require('express');
const router = express.Router();
const Api = require('../models/Api');
const AIProvider = require('../models/AIProvider');
const { checkApi } = require('../services/monitorService');
const { checkAIProvider } = require('../services/aiMonitorService');

// @desc    Trigger API & AI Provider monitoring checks (Vercel Cron endpoint)
// @route   GET /api/cron
// @access  Public (Protected by CRON_SECRET if set)
router.get('/', async (req, res) => {
  // Protect the endpoint with Vercel Cron Secret if configured
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const now = Date.now();
    let checkedCount = 0;
    let checkedAICount = 0;

    // 1. Check standard APIs
    const apis = await Api.find({ active: true });
    const checkPromises = apis.map(async (api) => {
      const intervalMs = (api.interval || 5) * 60 * 1000;
      const lastCheckTime = api.lastChecked ? new Date(api.lastChecked).getTime() : 0;
      
      if (now - lastCheckTime >= intervalMs - 30000 || !api.lastChecked) {
        checkedCount++;
        return checkApi(api).catch(err => {
          console.error(`Error checking ${api.apiName}:`, err.message);
        });
      }
    });

    // 2. Check AI Providers
    const aiProviders = await AIProvider.find({ monitoringEnabled: true });
    const aiCheckPromises = aiProviders.map(async (provider) => {
      const intervalMs = (provider.interval || 5) * 60 * 1000;
      const lastCheckTime = provider.lastCheckAt ? new Date(provider.lastCheckAt).getTime() : 0;

      if (now - lastCheckTime >= intervalMs - 30000 || !provider.lastCheckAt) {
        checkedAICount++;
        return checkAIProvider(provider).catch(err => {
          console.error(`Error checking AI provider ${provider.providerName}:`, err.message);
        });
      }
    });

    // Execute checks in parallel
    await Promise.all([...checkPromises, ...aiCheckPromises]);

    res.json({
      success: true,
      message: `Cron executed successfully. Checked ${checkedCount} APIs and ${checkedAICount} AI Providers.`,
      checkedAPIs: checkedCount,
      checkedAIProviders: checkedAICount,
    });
  } catch (error) {
    console.error('Cron execution error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
