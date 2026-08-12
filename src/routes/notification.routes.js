// ============================================
// Notification Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validateNotification } = require('../middleware/validate');
const {
  getNotifications,
  getNotification,
  createNotification,
  deleteNotification,
} = require('../controllers/notification.controller');

// Public
router.get('/', getNotifications);
router.get('/:id', getNotification);

// Admin only
router.post('/', authenticate, authorize('ADMIN'), validate(validateNotification), createNotification);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteNotification);

module.exports = router;
