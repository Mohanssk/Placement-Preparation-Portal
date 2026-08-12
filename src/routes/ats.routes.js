// ============================================
// ATS Analyzer Routes
// ============================================

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');
const { analyze, getHistory, getScan } = require('../controllers/ats.controller');

// All ATS routes require authentication
router.post('/analyze', authenticate, handleUpload, analyze);
router.get('/history', authenticate, getHistory);
router.get('/history/:id', authenticate, getScan);

module.exports = router;
