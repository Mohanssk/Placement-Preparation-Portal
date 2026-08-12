// ============================================
// Resume Asset Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validateAsset } = require('../middleware/validate');
const {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
} = require('../controllers/asset.controller');

// Public
router.get('/', getAssets);
router.get('/:id', getAsset);

// Admin only
router.post('/', authenticate, authorize('ADMIN'), validate(validateAsset), createAsset);
router.put('/:id', authenticate, authorize('ADMIN'), updateAsset);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteAsset);

module.exports = router;
