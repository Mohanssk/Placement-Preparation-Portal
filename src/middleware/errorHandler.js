// ============================================
// Global Error Handler Middleware
// ============================================

const errorHandler = (err, req, res, _next) => {
  console.error('🔥 Error:', err);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // ── Prisma-Specific Errors ───────────────────
  if (err.code) {
    switch (err.code) {
      // Unique constraint violation
      case 'P2002':
        statusCode = 409;
        const fields = err.meta?.target?.join(', ') || 'field';
        message = `A record with this ${fields} already exists.`;
        break;

      // Record not found
      case 'P2025':
        statusCode = 404;
        message = 'Record not found.';
        break;

      // Foreign key constraint failed
      case 'P2003':
        statusCode = 400;
        message = 'Related record not found. Check your reference IDs.';
        break;

      // Invalid ID format
      case 'P2023':
        statusCode = 400;
        message = 'Invalid ID format.';
        break;

      default:
        break;
    }
  }

  // ── JWT Errors ───────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired.';
  }

  // ── Validation Errors ────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = err.errors;
  }

  // ── Response ─────────────────────────────────
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  };

  res.status(statusCode).json(response);
};

module.exports = { errorHandler };
