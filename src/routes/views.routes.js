// ============================================
// View Routes — SSR Page Routing
// ============================================
// Serves EJS-rendered HTML pages.
// Keeps existing /api/* JSON routes untouched.

const express = require('express');
const router = express.Router();
const { cookieAuth, optionalCookieAuth, adminPage } = require('../middleware/cookieAuth');
const {
  landing,
  loginPage,
  registerPage,
  dashboard,
  companiesList,
  companyDetail,
  prepHub,
  experiencesList,
  newExperiencePage,
  experienceDetail,
  atsScanner,
  roadmapPage,
  logout,
  adminDashboard,
  adminNotices,
  adminCompanies,
  adminStudents,
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

// Must stay ABOVE /experiences/:id — Express matches in order, so the param
// route would otherwise treat "new" as an experience id and 404.
// cookieAuth (not optionalCookieAuth): posting requires an account, so send
// anonymous visitors to /login rather than rendering a form that will 401.
router.get('/experiences/new', cookieAuth, newExperiencePage);

router.get('/experiences/:id', optionalCookieAuth, experienceDetail);

// ── Auth Required Pages ────────────────────────
router.get('/dashboard', cookieAuth, dashboard);
router.get('/ats-scanner', cookieAuth, atsScanner);

// ── Public (AI Tools) ─────────────────────────
router.get('/roadmap', optionalCookieAuth, roadmapPage);

// ── Admin Pages (ADMIN role only) ─────────────
// cookieAuth handles "logged out" (→ /login); adminPage handles
// "logged in but not an admin" (→ 403 page).
router.get('/admin', cookieAuth, adminPage, adminDashboard);
router.get('/admin/notices', cookieAuth, adminPage, adminNotices);
router.get('/admin/companies', cookieAuth, adminPage, adminCompanies);
router.get('/admin/students', cookieAuth, adminPage, adminStudents);

// ── Logout ─────────────────────────────────────
router.get('/logout', logout);

module.exports = router;
