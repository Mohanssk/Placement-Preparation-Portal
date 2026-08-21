// ============================================
// Cookie-Based JWT Authentication Middleware
// ============================================
// For SSR page routes: reads JWT from the 'token' cookie.
// Works alongside the existing Bearer token auth for API routes.

const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Required cookie auth — redirects to /login on failure.
 */
const cookieAuth = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.token;

    if (!token) {
      return res.redirect('/login');
    }

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
      },
    });

    if (!user) {
      return res.redirect('/login');
    }

    req.user = user;
    next();
  } catch (error) {
    // Token expired or invalid → redirect to login
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

/**
 * Optional cookie auth — attaches user if valid token, otherwise continues.
 * Used for public pages that show personalized content when logged in.
 */
const optionalCookieAuth = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.token;

    if (!token) {
      req.user = null;
      return next();
    }

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
      },
    });

    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

/**
 * Admin-only guard for SSR page routes.
 *
 * Unlike `isAdmin` (which returns JSON), this renders human-facing
 * outcomes: unauthenticated visitors are sent to /login, while
 * logged-in non-admins get a 403 page instead of a silent redirect.
 *
 * Must be mounted AFTER `cookieAuth` so `req.user` is populated.
 *
 * @example
 * router.get('/admin', cookieAuth, adminPage, adminDashboard);
 */
const adminPage = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).render('403', { user: req.user });
  }

  next();
};

module.exports = { cookieAuth, optionalCookieAuth, adminPage };
