// ============================================
// Roadmap AI Routes
// ============================================
// API endpoints for the Roadmap AI feature.
// Mounted at /api/roadmap in app.js.

const express = require('express');
const router = express.Router();
const {
  getSkills,
  generateRoadmap,
  getNodeCerts,
  explainTopic,
  chatWithMentor,
} = require('../controllers/roadmap.controller');

// GET  /api/roadmap/skills      — List available career paths
router.get('/skills', getSkills);

// POST /api/roadmap/generate    — Get roadmap nodes for a skill
router.post('/generate', generateRoadmap);

// POST /api/roadmap/node-certs  — Get free certification links for a node
router.post('/node-certs', getNodeCerts);

// POST /api/roadmap/explain     — AI-powered topic explanation
router.post('/explain', explainTopic);

// POST /api/roadmap/chat        — AI mentor chat
router.post('/chat', chatWithMentor);

module.exports = router;
