// ============================================
// Roadmap AI Controller — Gemini Integration
// ============================================
// Translates the Python/Flask Roadmap AI logic into
// Node.js/Express using the existing Gemini AI provider.

const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// ── Load Roadmap Data (Vercel Serverless Safe) ──
const roadmapPath = path.join(__dirname, '..', '..', 'data', 'roadmaps_master.json');
let ROADMAPS = {};

try {
  const raw = fs.readFileSync(roadmapPath, 'utf-8');
  ROADMAPS = JSON.parse(raw);
} catch (err) {
  console.error('[Roadmap Controller] Failed to load roadmaps_master.json:', err.message);
}

// ── Helper Functions ────────────────────────────

/**
 * Normalize a skill name to match JSON keys (lowercase, hyphenated).
 */
function normalizeSkill(skill) {
  return skill.toLowerCase().replace(/ /g, '-').replace(/_/g, '-');
}

/**
 * Generate free certification search URLs for a topic.
 */
function generateFreeCerts(topic) {
  const q = encodeURIComponent(topic);
  return [
    { title: `freeCodeCamp — ${topic}`, url: `https://www.freecodecamp.org/news/search/?query=${q}` },
    { title: `Coursera Free Courses — ${topic}`, url: `https://www.coursera.org/search?query=${q}&price=free` },
    { title: `edX Free Courses — ${topic}`, url: `https://www.edx.org/search?q=${q}&price=free` },
    { title: `Google Digital Garage — ${topic}`, url: `https://learndigital.withgoogle.com/digitalgarage/search?q=${q}` },
    { title: `Kaggle Learn — ${topic}`, url: `https://www.kaggle.com/search?q=${q}` },
  ];
}

/**
 * Ask Gemini AI a question with a system instruction.
 * Replaces the original Python ask_openrouter() function.
 */
async function askGemini(systemInstruction, userMessage) {
  if (!process.env.GEMINI_API_KEY) {
    return 'AI not configured. Please set the GEMINI_API_KEY environment variable.';
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const fullPrompt = `${systemInstruction}\n\nUser: ${userMessage}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: fullPrompt,
    });

    return response.text || 'Sorry, I could not generate a response. Please try again.';
  } catch (error) {
    console.error('[Roadmap Controller] Gemini API error:', error.message);
    return `AI Error: ${error.message}`;
  }
}

// ── API Controllers ─────────────────────────────

/**
 * GET /api/roadmap/skills
 * Returns list of available skill keys.
 */
const getSkills = (req, res) => {
  return res.json(Object.keys(ROADMAPS));
};

/**
 * POST /api/roadmap/generate
 * Returns roadmap nodes for a given skill.
 * Body: { skill: "frontend" }
 */
const generateRoadmap = (req, res) => {
  const skill = normalizeSkill(req.body.skill || '');

  if (!ROADMAPS[skill]) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  return res.json({ roadmap: ROADMAPS[skill] });
};

/**
 * POST /api/roadmap/node-certs
 * Returns free certification URLs for a roadmap node.
 * Body: { node: "React" }
 */
const getNodeCerts = (req, res) => {
  const node = req.body.node || '';
  const certifications = generateFreeCerts(node);
  return res.json({ certifications });
};

/**
 * POST /api/roadmap/explain
 * Returns AI-generated explanation for a topic.
 * Body: { topic: "React" }
 */
const explainTopic = async (req, res) => {
  const topic = req.body.topic || '';

  const explanation = await askGemini(
    'Explain in short sections: What it is, Why important, How to learn, Time required.',
    topic
  );

  return res.json({ explanation });
};

/**
 * POST /api/roadmap/chat
 * AI mentor chat for learning guidance.
 * Body: { question: "How do I learn React?" }
 */
const chatWithMentor = async (req, res) => {
  const question = req.body.question || '';

  const reply = await askGemini(
    'You are an AI learning mentor. Be concise and encouraging.',
    question
  );

  return res.json({ reply });
};

module.exports = {
  getSkills,
  generateRoadmap,
  getNodeCerts,
  explainTopic,
  chatWithMentor,
};
