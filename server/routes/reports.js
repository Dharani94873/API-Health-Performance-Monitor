const express = require('express');
const router = express.Router();
const { exportCsv, exportJson } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/csv', protect, exportCsv);
router.get('/json', protect, exportJson);

module.exports = router;
