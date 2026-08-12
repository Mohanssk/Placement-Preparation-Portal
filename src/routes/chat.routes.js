// ============================================
// AI Chat Routes
// ============================================

const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/chat.controller');

// POST /api/chat — Send a prompt, get an AI reply
router.post('/', chat);

module.exports = router;
