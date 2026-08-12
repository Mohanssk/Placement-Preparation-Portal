// ============================================
// Auth Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate, validateRegistration, validateLogin } = require('../middleware/validate');
const {
  register,
  login,
  getProfile,
  updateProfile,
} = require('../controllers/auth.controller');

// Public
router.post('/register', validate(validateRegistration), register);
router.post('/login', validate(validateLogin), login);

// Protected
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
