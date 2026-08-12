// ============================================
// Company Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validateCompany } = require('../middleware/validate');
const {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../controllers/company.controller');

// Public
router.get('/', getCompanies);
router.get('/:id', getCompany);

// Admin only
router.post('/', authenticate, authorize('ADMIN'), validate(validateCompany), createCompany);
router.put('/:id', authenticate, authorize('ADMIN'), updateCompany);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteCompany);

module.exports = router;
