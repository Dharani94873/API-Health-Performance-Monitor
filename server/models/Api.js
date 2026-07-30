const mongoose = require('mongoose');

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
    type: Number, // in milliseconds
    default: 5000,
    min: [1000, 'Timeout must be at least 1 second'],
    max: [30000, 'Timeout cannot exceed 30 seconds'],
  },
  interval: {
    type: Number, // in minutes
    default: 5,
    min: [1, 'Interval must be at least 1 minute'],
    max: [60, 'Interval cannot exceed 60 minutes'],
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
  tags: [{ type: String, trim: true }],
  lastChecked: {
    type: Date,
    default: null,
  },
  lastStatus: {
    type: String,
    enum: ['healthy', 'degraded', 'down', 'unknown'],
    default: 'unknown',
  },
  uptimePercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, { timestamps: true });

// Index for fast queries
apiSchema.index({ userId: 1, createdAt: -1 });
apiSchema.index({ active: 1 });

module.exports = mongoose.model('Api', apiSchema);
