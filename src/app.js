// ============================================
// Express App Configuration
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');

// ── Route Imports ──────────────────────────────
const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const experienceRoutes = require('./routes/experience.routes');
const resourceRoutes = require('./routes/resource.routes');
const assetRoutes = require('./routes/asset.routes');
const notificationRoutes = require('./routes/notification.routes');
const atsRoutes = require('./routes/ats.routes');

const app = express();

// ── Security Middleware ────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate Limiting ──────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
app.use('/api/', limiter);

// ── Body Parsing ───────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Health Check ───────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Placement Preparation Portal API is running.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ─────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/experiences', experienceRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ats', atsRoutes);

// ── 404 Handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Global Error Handler ───────────────────────
app.use(errorHandler);

module.exports = app;
