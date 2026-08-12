// ============================================
// Role-Based Authorization Middleware
// ============================================

/**
 * Creates a middleware that restricts access to specified roles.
 * Must be used AFTER the `authenticate` middleware.
 *
 * @param  {...string} allowedRoles - One or more roles: 'ADMIN', 'STUDENT', 'ALUMNI'
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/companies', authenticate, authorize('ADMIN'), createCompany);
 * router.post('/experiences', authenticate, authorize('STUDENT', 'ALUMNI'), createExperience);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

module.exports = { authorize };
