const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createAIProvider,
  getAIProviders,
  getAIProvider,
  updateAIProvider,
  deleteAIProvider,
  toggleAIProvider,
  testAIProvider,
  getAIProviderLogs,
} = require('../controllers/aiProviderController');
const { getAIProviderAnalytics } = require('../controllers/aiAnalyticsController');

// All routes require authentication
router.use(protect);

router.route('/')
  .post(createAIProvider)
  .get(getAIProviders);

router.route('/:id')
  .get(getAIProvider)
  .put(updateAIProvider)
  .delete(deleteAIProvider);

router.patch('/:id/toggle', toggleAIProvider);
router.post('/:id/test', testAIProvider);
router.get('/:id/logs', getAIProviderLogs);
router.get('/:id/analytics', getAIProviderAnalytics);

module.exports = router;
