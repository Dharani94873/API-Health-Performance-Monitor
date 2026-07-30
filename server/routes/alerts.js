const express = require('express');
const router = express.Router();
const { getAlerts, resolveAlert, resolveAllAlerts, deleteAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAlerts);
router.put('/resolve-all', resolveAllAlerts);
router.put('/:id', resolveAlert);
router.delete('/:id', deleteAlert);

module.exports = router;
