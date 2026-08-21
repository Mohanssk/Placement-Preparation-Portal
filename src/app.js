// ============================================
// Express App Configuration
// ============================================

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
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
const viewRoutes = require('./routes/views.routes');
const chatRoutes = require('./routes/chat.routes');
const roadmapRoutes = require('./routes/roadmap.routes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// ── View Engine (EJS) ─────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static Files ──────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Security Middleware ────────────────────────
// Helmet with relaxed CSP for EJS pages (allow inline styles, Google Fonts, FontAwesome CDN)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Cookie Parser ─────────────────────────────
app.use(cookieParser());

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
app.use('/api/chat', chatRoutes);
app.use('/api/roadmap', roadmapRoutes);

// Admin surface — every route inside is gated by `isAdmin`.
app.use('/api/admin', adminRoutes);

// ── View Routes (SSR Pages) ───────────────────
app.use('/', viewRoutes);

// ── 404 Handler ────────────────────────────────
app.use((req, res) => {
  // If it's an API request, respond with JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
  }
  // Otherwise redirect to landing page
  res.redirect('/');
});

// ── Global Error Handler ───────────────────────
app.use(errorHandler);

module.exports = app;
