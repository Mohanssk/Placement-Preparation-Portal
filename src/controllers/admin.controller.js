// ============================================
// Admin Controller
// ============================================
// Every handler here is reachable only through `isAdmin` (see
// routes/adminRoutes.js). Handlers therefore assume `req.user` exists
// and is an ADMIN, but never assume the *target* of an operation is safe
// to mutate — guards for cascading deletes and role changes live below.

const prisma = require('../config/database');
const {
  asyncHandler,
  successResponse,
  parsePagination,
  paginatedResponse,
} = require('../utils/helpers');

// ── Helpers ────────────────────────────────────

/**
 * Coerces the admin form's comma-separated text inputs into the JSON
 * arrays the Company model stores. Accepts an array as-is.
 *
 * @param {string|string[]|undefined} value
 * @returns {string[]|undefined} undefined when the caller omitted the field
 */
const toStringArray = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

/**
 * Averages a list of numbers, rounded to the nearest integer.
 *
 * @param {number[]} values
 * @returns {number|null} null for an empty list — distinct from a genuine 0
 */
const average = (values) => {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
};

// ============================================
// Notice Board Management
// ============================================

/**
 * GET /api/admin/notices
 * Paginated notice list for the management table (newest first).
 */
const listNotices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [notices, total] = await Promise.all([
    prisma.notification.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.notification.count(),
  ]);

  res.json(paginatedResponse({ data: notices, total, page, limit }));
});

/**
 * POST /api/admin/notices
 * Create a placement alert.
 *
 * Body: { title, message, type?, companyName?, eventDate?, targetBatch? }
 * `eventDate` is the Deadline; `targetBatch` null means "all batches".
 */
const createNotice = asyncHandler(async (req, res) => {
  const { title, message, type, companyName, eventDate, targetBatch } = req.body;

  const notice = await prisma.notification.create({
    data: {
      title: title.trim(),
      message: message.trim(),
      type: type || 'GENERAL',
      companyName: companyName ? companyName.trim() : null,
      eventDate: eventDate ? new Date(eventDate) : null,
      targetBatch: targetBatch ? String(targetBatch).trim() : null,
      authorId: req.user.id,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  successResponse(res, {
    statusCode: 201,
    message: 'Notice published successfully.',
    data: notice,
  });
});

/**
 * DELETE /api/admin/notices/:id
 * Remove an outdated notice.
 */
const deleteNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Notice not found.',
    });
  }

  await prisma.notification.delete({ where: { id } });

  successResponse(res, { message: `Notice "${existing.title}" deleted.` });
});

// ============================================
// Company & Drive Management
// ============================================

/**
 * GET /api/admin/companies
 * Company list with experience counts, for the management table.
 */
const listCompanies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search } = req.query;

  const where = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: { _count: { select: { experiences: true } } },
    }),
    prisma.company.count({ where }),
  ]);

  res.json(paginatedResponse({ data: companies, total, page, limit }));
});

/**
 * POST /api/admin/companies
 * Add a company profile and its eligibility criteria.
 *
 * Body: { name, description?, website?, rolesHired?, eligibilityCriteria?,
 *         minCGPA?, allowedBranches? }
 */
const createCompany = asyncHandler(async (req, res) => {
  const {
    name, description, website, rolesHired,
    eligibilityCriteria, minCGPA, allowedBranches,
  } = req.body;

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      description: description || null,
      website: website || null,
      rolesHired: toStringArray(rolesHired) ?? [],
      eligibilityCriteria: eligibilityCriteria || null,
      minCGPA: minCGPA !== undefined && minCGPA !== null && minCGPA !== ''
        ? parseFloat(minCGPA)
        : null,
      allowedBranches: toStringArray(allowedBranches) ?? [],
    },
  });

  successResponse(res, {
    statusCode: 201,
    message: `${company.name} added successfully.`,
    data: company,
  });
});

/**
 * PUT /api/admin/companies/:id
 * Update company details. Only fields present in the body are touched,
 * so a partial form submission cannot blank out existing data.
 */
const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name, description, website, rolesHired,
    eligibilityCriteria, minCGPA, allowedBranches,
  } = req.body;

  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Company not found.',
    });
  }

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description || null;
  if (website !== undefined) data.website = website || null;
  if (eligibilityCriteria !== undefined) data.eligibilityCriteria = eligibilityCriteria || null;
  if (minCGPA !== undefined) {
    data.minCGPA = minCGPA === null || minCGPA === '' ? null : parseFloat(minCGPA);
  }

  const roles = toStringArray(rolesHired);
  if (roles !== undefined) data.rolesHired = roles;

  const branches = toStringArray(allowedBranches);
  if (branches !== undefined) data.allowedBranches = branches;

  const company = await prisma.company.update({ where: { id }, data });

  successResponse(res, {
    message: `${company.name} updated successfully.`,
    data: company,
  });
});

/**
 * DELETE /api/admin/companies/:id
 *
 * Destructive and cascading: the Company → InterviewExperience relation
 * is `onDelete: Cascade`, so this also destroys every interview
 * experience students contributed for that company. The count is
 * returned so the UI can state the blast radius, and the caller must
 * echo the exact company name in `?confirm=` to proceed.
 */
const deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const confirm = req.query.confirm || req.body?.confirm;

  const existing = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { experiences: true } },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Company not found.',
    });
  }

  if (confirm !== existing.name) {
    return res.status(400).json({
      success: false,
      message: `Confirmation required. Deleting "${existing.name}" will also permanently remove ${existing._count.experiences} interview experience(s). Re-send with confirm="${existing.name}".`,
      data: {
        requiresConfirmation: true,
        companyName: existing.name,
        cascadeExperienceCount: existing._count.experiences,
      },
    });
  }

  await prisma.company.delete({ where: { id } });

  successResponse(res, {
    message: `${existing.name} deleted, along with ${existing._count.experiences} interview experience(s).`,
  });
});

// ============================================
// Student Insights
// ============================================

/**
 * GET /api/admin/students
 * Registered students with an ATS Scanner usage summary, so the
 * placement cell can track readiness.
 *
 * Query: page, limit, search (name/email), branch, graduationYear, role
 *
 * Each row carries an `ats` block: scan count, average / best / latest
 * match score, last scan date, and a readiness band derived from the
 * average (READY ≥ 75, IMPROVING ≥ 50, AT_RISK < 50, NO_DATA if unscanned).
 */
const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, branch, graduationYear, role } = req.query;

  const where = {};

  // Default to the cohort the placement cell cares about; `role=ALL` opts out.
  if (role && role !== 'ALL') {
    where.role = role;
  } else if (!role) {
    where.role = { in: ['STUDENT', 'ALUMNI'] };
  }

  if (branch) where.branch = { contains: branch, mode: 'insensitive' };
  if (graduationYear) {
    const year = parseInt(graduationYear, 10);
    if (!Number.isNaN(year)) where.graduationYear = year;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        college: true,
        branch: true,
        graduationYear: true,
        createdAt: true,
        _count: { select: { atsScans: true, experiences: true } },
        // Pulled per-student rather than as one grouped query: the page size is
        // capped at 100 and this keeps the score history ordered for `latest`.
        atsScans: {
          orderBy: { createdAt: 'desc' },
          select: { matchScore: true, createdAt: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const data = students.map((student) => {
    const { atsScans, _count, ...profile } = student;
    const scores = atsScans.map((scan) => scan.matchScore);
    const avg = average(scores);

    let readiness = 'NO_DATA';
    if (avg !== null) {
      if (avg >= 75) readiness = 'READY';
      else if (avg >= 50) readiness = 'IMPROVING';
      else readiness = 'AT_RISK';
    }

    return {
      ...profile,
      experienceCount: _count.experiences,
      ats: {
        scanCount: _count.atsScans,
        averageScore: avg,
        bestScore: scores.length ? Math.max(...scores) : null,
        latestScore: scores.length ? scores[0] : null,
        lastScanAt: atsScans.length ? atsScans[0].createdAt : null,
        readiness,
      },
    };
  });

  res.json(paginatedResponse({ data, total, page, limit }));
});

/**
 * PATCH /api/admin/users/:id/role
 * Promote or demote a user.
 *
 * Two lockouts are enforced: an admin cannot change their own role
 * (no accidental self-demotion mid-session), and the last remaining
 * ADMIN cannot be demoted (no locking everyone out of the panel).
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot change your own role. Ask another admin to do it.',
    });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!target) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  if (target.role === role) {
    return successResponse(res, {
      message: `${target.name} is already ${role}.`,
      data: target,
    });
  }

  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return res.status(409).json({
        success: false,
        message: 'Cannot demote the last remaining admin — the portal would have no administrator.',
      });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  successResponse(res, {
    message: `${user.name} is now ${user.role}.`,
    data: user,
  });
});

// ============================================
// Dashboard Stats
// ============================================

/**
 * GET /api/admin/stats
 * High-level counters for the admin command center. The SSR dashboard
 * renders these directly; this endpoint exists for polling/refresh.
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  successResponse(res, { data: stats });
});

/**
 * Shared stat aggregation, used by both GET /api/admin/stats and the
 * server-rendered admin dashboard so the two can never disagree.
 *
 * @returns {Promise<object>} Counters plus the portal-wide average ATS score
 */
const getDashboardStats = async () => {
  const now = new Date();

  const [
    totalStudents,
    totalAlumni,
    totalAdmins,
    totalCompanies,
    activeDrives,
    totalNotices,
    totalExperiences,
    scanAggregate,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'ALUMNI' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.company.count(),
    // "Active drive" = a notice whose deadline has not yet passed.
    prisma.notification.count({ where: { eventDate: { gte: now } } }),
    prisma.notification.count(),
    prisma.interviewExperience.count(),
    prisma.atsScan.aggregate({ _avg: { matchScore: true }, _count: true }),
  ]);

  return {
    totalStudents,
    totalAlumni,
    totalAdmins,
    totalCompanies,
    activeDrives,
    totalNotices,
    totalExperiences,
    totalScans: scanAggregate._count,
    averageAtsScore: scanAggregate._avg.matchScore !== null
      ? Math.round(scanAggregate._avg.matchScore)
      : null,
  };
};

module.exports = {
  // Notices
  listNotices,
  createNotice,
  deleteNotice,
  // Companies
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  // Students & users
  listStudents,
  updateUserRole,
  // Stats
  getStats,
  getDashboardStats,
};
