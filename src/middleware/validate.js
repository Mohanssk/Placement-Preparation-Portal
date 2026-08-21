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

const isValidDate = (value) =>
  !Number.isNaN(new Date(value).getTime());

/**
 * Shared field rules for the admin company create/update validators.
 * Only checks fields that are actually present on the body.
 *
 * @param {object} body - Request body
 * @returns {string[]} Error messages (empty when everything present is valid)
 */
const companyFieldErrors = (body) => {
  const errors = [];

  if (body.website && !/^https?:\/\/.+/.test(body.website))
    errors.push('Website must start with http:// or https://');

  if (body.minCGPA !== undefined && body.minCGPA !== null && body.minCGPA !== '') {
    const cgpa = parseFloat(body.minCGPA);
    if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10)
      errors.push('Minimum CGPA must be a number between 0 and 10.');
  }

  // The admin form posts comma-separated text; the API also accepts arrays.
  for (const field of ['allowedBranches', 'rolesHired']) {
    const value = body[field];
    if (value === undefined || value === null) continue;
    if (!Array.isArray(value) && typeof value !== 'string')
      errors.push(`${field} must be an array or a comma-separated string.`);
  }

  return errors;
};

// ── Validators ─────────────────────────────────

const validateRegistration = (body) => {
  const errors = [];

  if (!isNonEmpty(body.name)) errors.push('Name is required.');
  if (!isNonEmpty(body.email) || !isEmail(body.email))
    errors.push('A valid email is required.');
  if (!isMinLength(body.password, 6))
    errors.push('Password must be at least 6 characters.');
  // Self-signup may never mint an admin. Admin access is granted only by an
  // existing admin (PATCH /api/admin/users/:id/role) or scripts/seedAdmin.js.
  if (body.role && !['STUDENT', 'ALUMNI'].includes(body.role))
    errors.push('Role must be STUDENT or ALUMNI.');

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

// ── Admin Validators ───────────────────────────

/**
 * Admin notice board post. Extends validateNotification with the
 * deadline (`eventDate`) and `targetBatch` fields the admin form sends.
 */
const validateNotice = (body) => {
  const errors = validateNotification(body).errors.slice();

  if (body.title && body.title.length > 200)
    errors.push('Title must be 200 characters or fewer.');
  if (body.eventDate && !isValidDate(body.eventDate))
    errors.push('Deadline must be a valid date.');
  if (body.targetBatch !== undefined && body.targetBatch !== null && body.targetBatch !== '') {
    if (!/^[0-9]{4}(\s*[,/-]\s*[0-9]{4})*$/.test(String(body.targetBatch).trim()))
      errors.push('Target batch must be a graduation year, e.g. 2026 or 2026,2027.');
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Admin company create/update. Extends validateCompany with the
 * eligibility fields (minCGPA, allowedBranches, rolesHired).
 */
const validateAdminCompany = (body) => {
  const errors = [];

  if (!isNonEmpty(body.name)) errors.push('Company name is required.');
  errors.push(...companyFieldErrors(body));

  return { isValid: errors.length === 0, errors };
};

/**
 * Admin company update. Same field rules, but every field is optional —
 * only what the request actually sends is checked, so a partial edit
 * cannot be rejected for omitting a field it does not intend to change.
 */
const validateAdminCompanyUpdate = (body) => {
  const errors = [];

  if (body.name !== undefined && !isNonEmpty(body.name))
    errors.push('Company name cannot be blank.');
  errors.push(...companyFieldErrors(body));

  return { isValid: errors.length === 0, errors };
};

/**
 * Admin role change. Only the three known roles are assignable.
 */
const validateRoleChange = (body) => {
  const errors = [];

  if (!body.role || !['STUDENT', 'ALUMNI', 'ADMIN'].includes(body.role))
    errors.push('Role must be STUDENT, ALUMNI, or ADMIN.');

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
  validateNotice,
  validateAdminCompany,
  validateAdminCompanyUpdate,
  validateRoleChange,
};
