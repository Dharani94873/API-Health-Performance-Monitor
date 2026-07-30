const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
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
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['down', 'timeout', 'status_mismatch', 'recovered'],
    default: 'down',
  },
  statusCode: {
    type: Number,
    default: null,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Indexes
alertSchema.index({ userId: 1, resolved: 1, createdAt: -1 });
alertSchema.index({ apiId: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
