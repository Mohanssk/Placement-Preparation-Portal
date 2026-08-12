// ============================================
// AI Chat Controller — Gemini Integration
// ============================================

const { GoogleGenAI } = require('@google/genai');

// Initialize the Gemini client (reads key from env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System instruction to scope the AI as a placement advisor
const SYSTEM_INSTRUCTION = `You are "PlaceBot", a friendly and knowledgeable AI assistant embedded in a Placement Preparation Portal for college students.

Your expertise includes:
- Resume building and ATS optimization tips
- Interview preparation (HR, technical, behavioral)
- Aptitude and reasoning practice guidance
- Company-specific placement processes and tips
- Coding and DSA preparation strategies
- Soft skills and communication advice
- Campus placement trends and salary negotiation

Guidelines:
- Keep responses concise but helpful (aim for 2-4 paragraphs unless the user asks for detail).
- Use markdown formatting (bold, bullet lists, code blocks) when it improves clarity.
- Be encouraging and supportive — students may be stressed about placements.
- If asked about something outside placement/career scope, politely redirect.
- Never fabricate company-specific salary data or guarantee outcomes.`;

/**
 * POST /api/chat
 * Accepts { prompt: "user message" } and returns { reply: "AI response" }
 */
const chat = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid prompt.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        reply: 'AI service is not configured. Please set the GEMINI_API_KEY environment variable.',
      });
    }

    // Build the full prompt with system instruction
    const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nUser: ${prompt.trim()}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: fullPrompt,
    });

    const reply = response.text || 'Sorry, I could not generate a response. Please try again.';

    return res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error('[Chat Controller] Gemini API error:', error.message);
    console.error('[Chat Controller] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    return res.status(500).json({
      success: false,
      reply: 'Oops! Something went wrong while connecting to the AI. Please try again in a moment.',
    });
  }
};

module.exports = { chat };
