const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  limit: { type: Number, default: null },
  remaining: { type: Number, default: null },
  reset: { type: Date, default: null },
  retryAfter: { type: Number, default: null },
  used: { type: Number, default: null },
}, { _id: false });

const logSchema = new mongoose.Schema({
  apiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Api',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  statusCode: { type: Number, default: null },
  responseTime: { type: Number, default: null }, // ms

  success: { type: Boolean, required: true },
  errorMessage: { type: String, default: null },
  errorPayload: { type: String, default: null }, // JSON or text response body on failure

  // Response size (Feature 5)
  responseSize: { type: Number, default: null },   // bytes
  payloadSize: { type: Number, default: null },     // body bytes
  contentType: { type: String, default: null },
  contentLength: { type: Number, default: null },

  // Response headers (Feature 3)
  responseHeaders: {
    type: Map,
    of: String,
    default: {},
  },

  // Rate limit (Feature 2)
  rateLimit: { type: rateLimitSchema, default: null },

  // SSL snapshot (Feature 4)
  sslValid: { type: Boolean, default: null },
  sslDaysRemaining: { type: Number, default: null },

  // Health score per check (Feature 6)
  healthScore: { type: Number, default: null, min: 0, max: 100 },

  checkedAt: { type: Date, default: Date.now },
}, { timestamps: false });

// Indexes
logSchema.index({ apiId: 1, checkedAt: -1 });
logSchema.index({ userId: 1, checkedAt: -1 });
logSchema.index({ checkedAt: -1 });

module.exports = mongoose.model('Log', logSchema);
