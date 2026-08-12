// ============================================
// Interview Experience Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validateExperience } = require('../middleware/validate');
const {
  getExperiences,
  getExperience,
  createExperience,
  updateExperience,
  deleteExperience,
} = require('../controllers/experience.controller');

// Public
router.get('/', getExperiences);
router.get('/:id', getExperience);

// Student & Alumni (auth check, ownership enforced in controller)
router.post('/', authenticate, authorize('STUDENT', 'ALUMNI', 'ADMIN'), validate(validateExperience), createExperience);
router.put('/:id', authenticate, updateExperience);
router.delete('/:id', authenticate, deleteExperience);

module.exports = router;
