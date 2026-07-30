const express = require('express');
const router = express.Router();
const { getLogs, getRecentLogs, exportLogs } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getRecentLogs);
router.get('/:apiId', getLogs);
router.get('/:apiId/export', exportLogs);

module.exports = router;
