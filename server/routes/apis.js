const express = require('express');
const router = express.Router();
const { createApi, getApis, getApi, updateApi, deleteApi, toggleApi } = require('../controllers/apiController');
const { protect } = require('../middleware/auth');
const { validateApi } = require('../middleware/validate');

router.use(protect);

router.route('/').get(getApis).post(validateApi, createApi);
router.route('/:id').get(getApi).put(updateApi).delete(deleteApi);
router.patch('/:id/toggle', toggleApi);

module.exports = router;
