const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAIOverview,
  compareAIProviders,
  getOpenAIUsageData,
  exportAICSV,
} = require('../controllers/aiAnalyticsController');

// All routes require authentication
router.use(protect);

router.get('/overview', getAIOverview);
router.get('/compare', compareAIProviders);
router.get('/openai', getOpenAIUsageData);
router.get('/export-csv', exportAICSV);

module.exports = router;
