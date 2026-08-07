const mongoose = require('mongoose');

const authSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['none', 'apiKey', 'bearer', 'basic', 'custom'],
    default: 'none',
  },
  // Encrypted storage for each auth type
  apiKeyEncrypted: { type: String, default: null },       // "key:value" encrypted
  apiKeyHeader: { type: String, default: 'X-API-Key' },   // header name for apiKey
  apiKeyLocation: { type: String, enum: ['header', 'query'], default: 'header' },
  bearerTokenEncrypted: { type: String, default: null },
  basicUsernameEncrypted: { type: String, default: null },
  basicPasswordEncrypted: { type: String, default: null },
  customHeadersEncrypted: { type: String, default: null }, // JSON string encrypted
}, { _id: false });

const apiSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  apiName: {
    type: String,
    required: [true, 'API name is required'],
    trim: true,
    maxlength: [100, 'API name cannot exceed 100 characters'],
  },
  apiUrl: {
    type: String,
    required: [true, 'API URL is required'],
    trim: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    default: 'GET',
  },
  expectedStatus: {
    type: Number,
    default: 200,
  },
  timeout: {
    type: Number,
    default: 5000,
    min: [1000, 'Timeout must be at least 1 second'],
    max: [30000, 'Timeout cannot exceed 30 seconds'],
  },
  interval: {
    type: Number,
    default: 5,
    min: [1, 'Interval must be at least 1 minute'],
    max: [1440, 'Interval cannot exceed 24 hours (1440 minutes)'],
  },
  active: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  headers: {
    type: Map,
    of: String,
    default: {},
  },
  requestBody: {
    type: String,
    default: null,
  },
  tags: [{ type: String, trim: true }],

  // Authentication (Feature 1)
  authentication: { type: authSchema, default: () => ({ type: 'none' }) },

  // Rate limit / Quota tracking (Feature 2)
  quotaLimit: { type: Number, default: null },
  quotaRemaining: { type: Number, default: null },
  quotaReset: { type: Date, default: null },
  quotaUsed: { type: Number, default: 0 },

  // SSL monitoring (Feature 4)
  sslValid: { type: Boolean, default: null },
  sslExpiry: { type: Date, default: null },
  sslDaysRemaining: { type: Number, default: null },
  sslIssuer: { type: String, default: null },
  sslLastChecked: { type: Date, default: null },

  // AI Health Score (Feature 6)
  healthScore: { type: Number, default: null, min: 0, max: 100 },
  healthGrade: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'Poor', null],
    default: null,
  },

  // Existing status fields
  lastChecked: { type: Date, default: null },
  lastStatus: {
    type: String,
    enum: ['healthy', 'degraded', 'down', 'unknown'],
    default: 'unknown',
  },
  uptimePercentage: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true });

// Indexes
apiSchema.index({ userId: 1, createdAt: -1 });
apiSchema.index({ active: 1 });
apiSchema.index({ lastStatus: 1 });

module.exports = mongoose.model('Api', apiSchema);
