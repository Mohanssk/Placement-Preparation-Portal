// ============================================
// View Routes — SSR Page Routing
// ============================================
// Serves EJS-rendered HTML pages.
// Keeps existing /api/* JSON routes untouched.

const express = require('express');
const router = express.Router();
const { cookieAuth, optionalCookieAuth } = require('../middleware/cookieAuth');
const {
  landing,
  loginPage,
  registerPage,
  dashboard,
  companiesList,
  companyDetail,
  prepHub,
  experiencesList,
  experienceDetail,
  atsScanner,
  logout,
} = require('../controllers/views.controller');

// ── Public Pages ───────────────────────────────
router.get('/', optionalCookieAuth, landing);
router.get('/login', optionalCookieAuth, loginPage);
router.get('/register', optionalCookieAuth, registerPage);

// ── Public (with optional personalization) ─────
router.get('/companies', optionalCookieAuth, companiesList);
router.get('/companies/:id', optionalCookieAuth, companyDetail);
router.get('/prep-hub', optionalCookieAuth, prepHub);
router.get('/experiences', optionalCookieAuth, experiencesList);
router.get('/experiences/:id', optionalCookieAuth, experienceDetail);

// ── Auth Required Pages ────────────────────────
router.get('/dashboard', cookieAuth, dashboard);
router.get('/ats-scanner', cookieAuth, atsScanner);

// ── Logout ─────────────────────────────────────
router.get('/logout', logout);

module.exports = router;
