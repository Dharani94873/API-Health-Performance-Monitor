const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const validateApi = [
  body('apiName').trim().notEmpty().withMessage('API name is required').isLength({ max: 100 }),
  body('apiUrl').trim().notEmpty().withMessage('API URL is required').isURL({ require_protocol: true }).withMessage('Valid URL with protocol required'),
  body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).withMessage('Invalid HTTP method'),
  body('expectedStatus').optional().isInt({ min: 100, max: 599 }).withMessage('Expected status must be 100-599'),
  body('timeout').optional().isInt({ min: 1000, max: 30000 }).withMessage('Timeout must be 1000-30000 ms'),
  body('interval').optional().isInt({ min: 1, max: 60 }).withMessage('Interval must be 1-60 minutes'),
  handleValidationErrors,
];

module.exports = { validateRegister, validateLogin, validateApi };
