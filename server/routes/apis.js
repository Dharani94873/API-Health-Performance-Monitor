const express = require('express');
const router = express.Router();
const {
  createApi, getApis, getApi, updateApi, deleteApi, toggleApi,
  testApi, compareApis, getApiSSL,
} = require('../controllers/apiController');
const { protect } = require('../middleware/auth');

// Compare must be before /:id to avoid route conflict
router.get('/compare', protect, compareApis);

router.route('/')
  .get(protect, getApis)
  .post(protect, createApi);

router.route('/:id')
  .get(protect, getApi)
  .put(protect, updateApi)
  .delete(protect, deleteApi);

router.patch('/:id/toggle', protect, toggleApi);
router.post('/:id/test', protect, testApi);
router.get('/:id/ssl', protect, getApiSSL);

module.exports = router;
