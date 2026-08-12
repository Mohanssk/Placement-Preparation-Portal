// ============================================
// Local Development Server
// ============================================
// This file is NOT used in Vercel production.
// It's only for running the API locally with `npm run dev`.

require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🎓 Placement Portal API                     ║
  ║  Running on: http://localhost:${PORT}           ║
  ║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(14)}         ║
  ║  Health: http://localhost:${PORT}/api/health    ║
  ╚══════════════════════════════════════════════╝
  `);
});
