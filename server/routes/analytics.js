const express = require('express');
const router = express.Router();
const { getAnalytics, getApiAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAnalytics);
router.get('/api/:id', getApiAnalytics);

module.exports = router;
