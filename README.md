# 🚀 API Health & Performance Monitor

A production-ready **MERN Stack** application for monitoring API endpoints in real-time with intelligent analytics, instant alerts, and a beautiful dashboard.

![Tech Stack](https://img.shields.io/badge/Stack-MERN-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)

---

## ✨ Features

- 🔐 **JWT Authentication** — Register, Login, Protected Routes
- 📡 **API Monitoring Engine** — Automated checks via `node-cron`
- 📊 **Analytics Dashboard** — Response time trends, uptime charts, success/failure charts
- 🔔 **Alert System** — Instant alerts on downtime, timeout, status mismatch
- 📧 **Email Notifications** — Optional Nodemailer integration
- 🔍 **Search & Filter** — By name, status, active/inactive
- 📥 **Export** — Logs to CSV
- 🌙 **Dark Mode** — Default dark theme with toggle
- 📱 **Responsive** — Mobile-friendly design
- 🛡️ **Security** — Helmet, CORS, Rate Limiting, Input Validation

---

## 🛠 Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Vite | Build Tool |
| React Router DOM 6 | Routing |
| Tailwind CSS 3 | Styling |
| Recharts | Charts |
| React Icons | Icons |
| Axios | HTTP Client |
| React Hot Toast | Notifications |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | Web Framework |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| node-cron | Scheduler |
| Helmet | Security Headers |
| express-rate-limit | Rate Limiting |
| express-validator | Input Validation |
| Nodemailer | Email Alerts |

---

## 🏗 Project Structure

```
📦 api-health-monitor/
├── 📁 client/               # React Frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Route pages
│   │   ├── layouts/         # Layout components
│   │   ├── context/         # React contexts
│   │   ├── services/        # API service (Axios)
│   │   └── utils/           # Helper functions
│   └── ...
└── 📁 server/               # Node.js Backend
    ├── config/              # DB & Email config
    ├── controllers/         # Route controllers
    ├── middleware/          # Auth, Error, Rate Limiter
    ├── models/              # Mongoose models
    ├── routes/              # Express routes
    ├── scheduler/           # node-cron scheduler
    ├── services/            # Business logic
    └── server.js
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js >= 18.x
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/Dharani94873/API-Health-Performance-Monitor.git
cd API-Health-Performance-Monitor
```

### 2. Setup Backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 3. Setup Frontend
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

### 4. Open in Browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

### Environment Variables (`.env`)
When deploying to Vercel, add these to your Project Settings > Environment Variables:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/api-monitor
JWT_SECRET=your_super_secret_key
NODE_ENV=production

# Optional - Email Notifications (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="API Monitor" <your@gmail.com>

# Optional - Vercel Cron Security
CRON_SECRET=a_random_secure_string_for_cron
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |

### API Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/apis` | Create API endpoint |
| GET | `/api/apis` | List all APIs |
| GET | `/api/apis/:id` | Get single API |
| PUT | `/api/apis/:id` | Update API |
| DELETE | `/api/apis/:id` | Delete API |
| PATCH | `/api/apis/:id/toggle` | Toggle active |

### Monitoring & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs/:apiId` | Get logs for API |
| GET | `/api/logs` | Get recent logs |
| GET | `/api/logs/:apiId/export` | Export CSV |
| GET | `/api/analytics` | Dashboard analytics |
| GET | `/api/analytics/api/:id` | API-specific analytics |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Get alerts |
| PUT | `/api/alerts/:id` | Resolve alert |
| PUT | `/api/alerts/resolve-all` | Resolve all |
| DELETE | `/api/alerts/:id` | Delete alert |

---

## 🚀 Deployment (Vercel)

This project is configured as a unified deployment on Vercel. Both the React frontend and Node.js backend are hosted in the same Vercel project, and the API monitor uses a Vercel Cron job.

1. Push your code to GitHub.
2. Go to your [Vercel Dashboard](https://vercel.com) and click **Add New > Project**.
3. Import your GitHub repository.
4. Leave the Framework Preset as **Vite** (Vercel will detect it automatically).
5. Open the **Environment Variables** section and add all required keys (see the Environment Variables section above).
6. Click **Deploy**.

> **Note on Vercel Cron Jobs:** Vercel's free Hobby plan limits cron jobs to running once per day. To run the API health checks every minute as intended, you either need a **Vercel Pro plan**, or you can use a free external service like [UptimeRobot](https://uptimerobot.com) to ping `https://your-app-domain.vercel.app/api/cron` every 1 minute.

---

## 📷 Screenshots

Visit the live demo to see:
- 🏠 Landing Page with animated hero
- 📊 Dashboard with real-time stats and charts
- 📡 API detail page with monitoring history
- 📈 Analytics page with 7-day trends
- 🔔 Notifications with alert management

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first.

---

## 📄 License

MIT © [Dharani](https://github.com/Dharani94873)
