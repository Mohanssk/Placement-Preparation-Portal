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

module.exports = { cookieAuth, optionalCookieAuth };
