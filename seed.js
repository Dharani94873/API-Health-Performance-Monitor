/**
 * Seed Script - Populates DB with demo data
 * Usage: node server/seed.js
 * Requires: .env file with MONGO_URI
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: './server/.env' });

const User = require('./server/models/User');
const Api = require('./server/models/Api');
const Log = require('./server/models/Log');

const demoApis = [
  { apiName: 'JSONPlaceholder Posts', apiUrl: 'https://jsonplaceholder.typicode.com/posts', method: 'GET', expectedStatus: 200, interval: 5, timeout: 5000 },
  { apiName: 'GitHub API', apiUrl: 'https://api.github.com', method: 'GET', expectedStatus: 200, interval: 10, timeout: 8000 },
  { apiName: 'HTTPBin Status', apiUrl: 'https://httpbin.org/status/200', method: 'GET', expectedStatus: 200, interval: 5, timeout: 5000 },
  { apiName: 'Fake API (404 test)', apiUrl: 'https://jsonplaceholder.typicode.com/nonexistent', method: 'GET', expectedStatus: 404, interval: 15, timeout: 5000 },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create demo user
    const existingUser = await User.findOne({ email: 'demo@apimonitor.com' });
    let user;
    if (existingUser) {
      user = existingUser;
      console.log('ℹ️ Demo user already exists');
    } else {
      user = await User.create({
        name: 'Demo User',
        email: 'demo@apimonitor.com',
        password: 'demo123456',
      });
      console.log('✅ Demo user created: demo@apimonitor.com / demo123456');
    }

    // Create sample APIs
    for (const apiData of demoApis) {
      const existing = await Api.findOne({ userId: user._id, apiName: apiData.apiName });
      if (!existing) {
        const api = await Api.create({ ...apiData, userId: user._id, lastStatus: 'healthy', uptimePercentage: 99.5 });

        // Create sample logs
        const logs = [];
        for (let i = 0; i < 20; i++) {
          logs.push({
            apiId: api._id,
            userId: user._id,
            statusCode: 200,
            responseTime: Math.floor(Math.random() * 500) + 100,
            success: Math.random() > 0.05,
            checkedAt: new Date(Date.now() - i * 5 * 60 * 1000),
          });
        }
        await Log.insertMany(logs);
        console.log(`✅ Created API: ${apiData.apiName}`);
      }
    }

    console.log('\n🎉 Seed complete!');
    console.log('📧 Login: demo@apimonitor.com');
    console.log('🔑 Password: demo123456');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
