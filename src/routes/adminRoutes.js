// ============================================
// Admin Routes — /api/admin
// ============================================
// The entire router is gated by `isAdmin`, applied via router.use()
// before any route is declared. Adding a route to this file therefore
// cannot accidentally leave it unprotected.
//
// isAdmin verifies the JWT (Bearer header or `token` cookie) and
// re-reads the role from the database, returning 401 for a bad token
// and 403 for an authenticated non-admin.

const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const {
  validate,
  validateNotice,
  validateAdminCompany,
  validateAdminCompanyUpdate,
  validateRoleChange,
} = require('../middleware/validate');
const {
  listNotices,
  createNotice,
  deleteNotice,
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  listStudents,
  updateUserRole,
  getStats,
} = require('../controllers/admin.controller');

// ── Blanket admin guard ───────────────────────
router.use(isAdmin);

// ── Dashboard ─────────────────────────────────
router.get('/stats', getStats);

// ── Notice Board Management ───────────────────
router.get('/notices', listNotices);
router.post('/notices', validate(validateNotice), createNotice);
router.delete('/notices/:id', deleteNotice);

// ── Company & Drive Management ────────────────
router.get('/companies', listCompanies);
router.post('/companies', validate(validateAdminCompany), createCompany);
router.put('/companies/:id', validate(validateAdminCompanyUpdate), updateCompany);
router.delete('/companies/:id', deleteCompany);

// ── Student Insights ──────────────────────────
router.get('/students', listStudents);
router.patch('/users/:id/role', validate(validateRoleChange), updateUserRole);

module.exports = router;
