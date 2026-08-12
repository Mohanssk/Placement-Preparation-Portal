// ============================================
// Request Validation Middleware
// ============================================
// Lightweight validation without heavy dependencies.
// Each validator returns { isValid, errors }.

/**
 * Factory that creates a validation middleware from a validator function.
 *
 * @param {Function} validatorFn - A function (body) => { isValid, errors }
 * @returns {Function} Express middleware
 */
const validate = (validatorFn) => {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req.body);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors,
      });
    }
    next();
  };
};

// ── Validation Helpers ─────────────────────────

const isEmail = (str) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

const isNonEmpty = (str) =>
  typeof str === 'string' && str.trim().length > 0;

const isMinLength = (str, min) =>
  typeof str === 'string' && str.length >= min;

// ── Validators ─────────────────────────────────

const validateRegistration = (body) => {
  const errors = [];

  if (!isNonEmpty(body.name)) errors.push('Name is required.');
  if (!isNonEmpty(body.email) || !isEmail(body.email))
    errors.push('A valid email is required.');
  if (!isMinLength(body.password, 6))
    errors.push('Password must be at least 6 characters.');
  if (body.role && !['STUDENT', 'ALUMNI', 'ADMIN'].includes(body.role))
    errors.push('Role must be STUDENT, ALUMNI, or ADMIN.');

  return { isValid: errors.length === 0, errors };
};

const validateLogin = (body) => {
  const errors = [];

  if (!isNonEmpty(body.email) || !isEmail(body.email))
    errors.push('A valid email is required.');
  if (!isNonEmpty(body.password))
    errors.push('Password is required.');

  return { isValid: errors.length === 0, errors };
};

const validateCompany = (body) => {
  const errors = [];

  if (!isNonEmpty(body.name)) errors.push('Company name is required.');

  return { isValid: errors.length === 0, errors };
};

const validateExperience = (body) => {
  const errors = [];

  if (!isNonEmpty(body.title)) errors.push('Title is required.');
  if (!isNonEmpty(body.content)) errors.push('Content is required.');
  if (!isNonEmpty(body.companyId)) errors.push('Company ID is required.');
  if (body.outcome && !['SELECTED', 'REJECTED', 'PENDING'].includes(body.outcome))
    errors.push('Outcome must be SELECTED, REJECTED, or PENDING.');

  return { isValid: errors.length === 0, errors };
};

const validateResource = (body) => {
  const errors = [];

  if (!isNonEmpty(body.title)) errors.push('Title is required.');
  if (!isNonEmpty(body.url)) errors.push('URL is required.');
  if (!body.category || !['APTITUDE', 'CODING', 'VERBAL', 'LOGICAL', 'TECHNICAL'].includes(body.category))
    errors.push('Category must be one of: APTITUDE, CODING, VERBAL, LOGICAL, TECHNICAL.');

  return { isValid: errors.length === 0, errors };
};

const validateAsset = (body) => {
  const errors = [];

  if (!isNonEmpty(body.title)) errors.push('Title is required.');
  if (!body.type || !['TEMPLATE', 'ACTION_WORDS'].includes(body.type))
    errors.push('Type must be TEMPLATE or ACTION_WORDS.');

  return { isValid: errors.length === 0, errors };
};

const validateNotification = (body) => {
  const errors = [];

  if (!isNonEmpty(body.title)) errors.push('Title is required.');
  if (!isNonEmpty(body.message)) errors.push('Message is required.');
  if (body.type && !['PLACEMENT_DRIVE', 'DEADLINE', 'GENERAL', 'URGENT'].includes(body.type))
    errors.push('Type must be PLACEMENT_DRIVE, DEADLINE, GENERAL, or URGENT.');

  return { isValid: errors.length === 0, errors };
};

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateCompany,
  validateExperience,
  validateResource,
  validateAsset,
  validateNotification,
};
