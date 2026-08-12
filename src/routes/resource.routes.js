// ============================================
// Preparation Resource Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validateResource } = require('../middleware/validate');
const {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
} = require('../controllers/resource.controller');

// Public
router.get('/', getResources);
router.get('/:id', getResource);

// Admin only
router.post('/', authenticate, authorize('ADMIN'), validate(validateResource), createResource);
router.put('/:id', authenticate, authorize('ADMIN'), updateResource);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteResource);

module.exports = router;
