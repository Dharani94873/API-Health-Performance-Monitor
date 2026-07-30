const express = require('express');
const router = express.Router();
const Api = require('../models/Api');
const { checkApi } = require('../services/monitorService');

// @desc    Trigger API monitoring checks (Vercel Cron endpoint)
// @route   GET /api/cron
// @access  Public (Protected by CRON_SECRET if set)
router.get('/', async (req, res) => {
  // Protect the endpoint with Vercel Cron Secret if configured
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const apis = await Api.find({ active: true });
    const now = Date.now();
    let checkedCount = 0;

    const checkPromises = apis.map(async (api) => {
      const intervalMs = api.interval * 60 * 1000;
      const lastCheckTime = api.lastChecked ? new Date(api.lastChecked).getTime() : 0;
      
      // Allow a 30-second buffer to ensure the check fires correctly on the cron schedule
      if (now - lastCheckTime >= intervalMs - 30000) {
        checkedCount++;
        // Catch errors so Promise.all won't fail for other APIs
        return checkApi(api).catch(err => {
          console.error(`Error checking ${api.apiName}:`, err.message);
        });
      }
    });

    // Execute checks in parallel (Vercel serverless has execution time limits)
    await Promise.all(checkPromises);

    res.json({ success: true, message: `Cron executed successfully. Checked ${checkedCount} APIs.` });
  } catch (error) {
    console.error('Cron execution error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
