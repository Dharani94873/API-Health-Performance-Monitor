const mongoose = require('mongoose');

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
  statusCode: {
    type: Number,
    default: null,
  },
  responseTime: {
    type: Number, // in milliseconds
    default: null,
  },
  success: {
    type: Boolean,
    required: true,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  responseSize: {
    type: Number,
    default: null,
  },
  checkedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false });

// Indexes
logSchema.index({ apiId: 1, checkedAt: -1 });
logSchema.index({ userId: 1, checkedAt: -1 });
logSchema.index({ checkedAt: -1 });

module.exports = mongoose.model('Log', logSchema);
