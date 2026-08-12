// ============================================
// Prisma Client Singleton — Serverless-Safe
// ============================================
// In serverless environments, each warm invocation reuses the same
// global scope. We cache the PrismaClient on `globalThis` to prevent
// spawning a new connection pool per request.

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
