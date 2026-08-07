const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const startScheduler = require('./scheduler/monitor');

// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/apis');
const logRoutes = require('./routes/logs');
const analyticsRoutes = require('./routes/analytics');
const alertRoutes = require('./routes/alerts');
const cronRoutes = require('./routes/cron');
const reportRoutes = require('./routes/reports');

dotenv.config();

const app = express();

// Security Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Connect to DB on every request (cached after first connect)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB Error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Database connection failed',
      error: err.message,
      hasMongoUri: !!process.env.MONGO_URI
    });
  }
});

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'API Health Monitor Server Running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/reports', reportRoutes);

// Error Handler
app.use(errorHandler);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Only listen if not running in Vercel serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    // Start monitoring scheduler
    startScheduler();
  });
}

module.exports = app;
