// ============================================
// JWT Authentication Middleware
// ============================================

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// Fields safe to attach to `req.user` — never includes `password`.
const SAFE_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  college: true,
  branch: true,
  graduationYear: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Reads a JWT from either the `Authorization: Bearer <token>` header
 * or the `token` cookie. Admin pages authenticate via cookie while
 * their fetch() calls send a Bearer header, so admin middleware must
 * accept both.
 *
 * @param {object} req - Express request
 * @returns {string|null} The raw token, or null if absent
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  if (req.cookies && req.cookies.token) return req.cookies.token;

  return null;
};

/**
 * Extracts and verifies JWT from Authorization header.
 * Attaches `req.user` with full user record (minus password).
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        college: true,
        branch: true,
        graduationYear: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    next(error);
  }
};

/**
 * Optional authentication — does NOT reject unauthenticated requests.
 * Attaches `req.user` if a valid token is present, otherwise continues.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch {
    // Invalid token is fine for optional auth — just continue
    next();
  }
};

/**
 * Admin-only guard for JSON/API routes.
 *
 * Self-contained: verifies the JWT (from Bearer header OR `token` cookie)
 * AND asserts the caller is an ADMIN. Does not need to be chained after
 * `authenticate` — mount it on its own.
 *
 *   401 — no token / invalid token / expired token / user deleted
 *   403 — valid token but the user is not an ADMIN
 *
 * The role is re-read from the database on every request rather than
 * trusted from the token payload, so demoting an admin revokes access
 * immediately instead of when their 7-day token expires.
 *
 * @example
 * router.use(isAdmin);                        // protect a whole router
 * router.post('/notices', isAdmin, create);   // or a single route
 */
const isAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: SAFE_USER_FIELDS,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists.',
      });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. This action requires administrator privileges.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    next(error);
  }
};

module.exports = { authenticate, optionalAuth, isAdmin, extractToken };
