// ============================================
// Vercel Serverless Entry Point
// ============================================
// This file exports the Express app as a Vercel
// Serverless Function. All traffic is routed here
// via vercel.json rewrite rules.

const app = require('../src/app');

module.exports = app;
