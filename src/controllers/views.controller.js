// ============================================
// Views Controller — SSR Page Rendering
// ============================================
// Queries the database and renders EJS templates.
// All data bindings match the Prisma schema exactly.

const prisma = require('../config/database');
const { getDashboardStats } = require('./admin.controller');

// Fallback shape for the admin dashboard when a stat query fails, so the
// template never has to guard every field.
const EMPTY_ADMIN_STATS = {
  totalStudents: 0,
  totalAlumni: 0,
  totalAdmins: 0,
  totalCompanies: 0,
  activeDrives: 0,
  totalNotices: 0,
  totalExperiences: 0,
  totalScans: 0,
  averageAtsScore: null,
};

/**
 * GET /
 * Landing page — redirects to dashboard if logged in.
 */
const landing = (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('landing');
};

/**
 * GET /login
 */
const loginPage = (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
};

/**
 * GET /register
 */
const registerPage = (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('register', { error: null });
};

/**
 * GET /dashboard
 * Requires authentication.
 */
const dashboard = async (req, res) => {
  try {
    const [companiesCount, experienceCount, atsScansCount, notificationsCount, recentNotifications] = await Promise.all([
      prisma.company.count(),
      prisma.interviewExperience.count(),
      prisma.atsScan.count({ where: { userId: req.user.id } }),
      prisma.notification.count(),
      prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.render('dashboard', {
      user: req.user,
      companiesCount,
      experienceCount,
      atsScansCount,
      notificationsCount,
      recentNotifications,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', {
      user: req.user,
      companiesCount: 0,
      experienceCount: 0,
      atsScansCount: 0,
      notificationsCount: 0,
      recentNotifications: [],
    });
  }
};

/**
 * GET /companies
 */
const companiesList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 12;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { experiences: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('companies', {
      user: req.user || null,
      companies,
      search,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Companies list error:', error);
    res.render('companies', {
      user: req.user || null,
      companies: [],
      search: '',
      pagination: { page: 1, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });
  }
};

/**
 * GET /companies/:id
 */
const companyDetail = async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        experiences: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            outcome: true,
            yearOfInterview: true,
            author: { select: { id: true, name: true } },
          },
        },
        _count: { select: { experiences: true } },
      },
    });

    if (!company) {
      return res.status(404).render('landing');
    }

    res.render('company-detail', {
      user: req.user || null,
      company,
    });
  } catch (error) {
    console.error('Company detail error:', error);
    return res.redirect('/companies');
  }
};

/**
 * GET /prep-hub
 */
const prepHub = async (req, res) => {
  try {
    const resources = await prisma.prepResource.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      take: 100,
    });

    res.render('prep-hub', {
      user: req.user || null,
      resources,
    });
  } catch (error) {
    console.error('Prep hub error:', error);
    res.render('prep-hub', {
      user: req.user || null,
      resources: [],
    });
  }
};

/**
 * GET /experiences
 */
const experiencesList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;
    const { search, outcome, companyId } = req.query;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (outcome) where.outcome = outcome;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [experiences, total, companies] = await Promise.all([
      prisma.interviewExperience.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, college: true } },
          company: { select: { id: true, name: true } },
          tags: { select: { id: true, name: true } },
        },
      }),
      prisma.interviewExperience.count({ where }),
      prisma.company.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.render('experiences', {
      user: req.user || null,
      experiences,
      companies,
      search: search || '',
      outcome: outcome || '',
      companyId: companyId || '',
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Experiences list error:', error);
    res.render('experiences', {
      user: req.user || null,
      experiences: [],
      companies: [],
      search: '',
      outcome: '',
      companyId: '',
      pagination: { page: 1, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });
  }
};

/**
 * GET /experiences/new
 * Submission form for a new interview experience.
 *
 * Mounted before /experiences/:id in views.routes.js — otherwise the
 * param route matches "new" and tries to look it up as an experience id.
 *
 * The company list is a hard requirement, not decoration: the form posts a
 * `companyId` and InterviewExperience.companyId is a non-null foreign key,
 * so with no companies on record there is nothing valid to submit. That case
 * renders as a real message instead of an empty dropdown that 400s on submit.
 */
const newExperiencePage = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    res.render('add-experience', {
      user: req.user,
      companies,
      loadError: null,
    });
  } catch (error) {
    console.error('New experience page error:', error);
    res.render('add-experience', {
      user: req.user,
      companies: [],
      loadError: 'Could not load the company list. Please refresh and try again.',
    });
  }
};

/**
 * GET /experiences/:id
 */
const experienceDetail = async (req, res) => {
  try {
    const experience = await prisma.interviewExperience.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, college: true, branch: true, graduationYear: true } },
        company: { select: { id: true, name: true, website: true } },
        tags: { select: { id: true, name: true } },
      },
    });

    if (!experience) {
      return res.redirect('/experiences');
    }

    res.render('experience-detail', {
      user: req.user || null,
      experience,
    });
  } catch (error) {
    console.error('Experience detail error:', error);
    return res.redirect('/experiences');
  }
};

/**
 * GET /ats-scanner
 * Requires authentication.
 */
const atsScanner = async (req, res) => {
  try {
    const history = await prisma.atsScan.findMany({
      where: { userId: req.user.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        matchScore: true,
        createdAt: true,
      },
    });

    res.render('ats-scanner', {
      user: req.user,
      history,
    });
  } catch (error) {
    console.error('ATS scanner error:', error);
    res.render('ats-scanner', {
      user: req.user,
      history: [],
    });
  }
};

/**
 * GET /logout
 */
const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
};

/**
 * GET /roadmap
 * AI-powered career roadmap page — public with optional personalization.
 */
const roadmapPage = (req, res) => {
  res.render('roadmap', {
    user: req.user || null,
    currentPath: '/roadmap',
  });
};

// ============================================
// Admin Pages
// ============================================
// All of these sit behind `cookieAuth` + `adminPage` in views.routes.js.
// Data is fetched server-side for first paint; mutations go through
// /api/admin/* from public/js/admin.js.

/**
 * GET /admin
 * Admin command center — high-level portal stats.
 */
const adminDashboard = async (req, res) => {
  try {
    const [stats, recentNotices, recentStudents] = await Promise.all([
      getDashboardStats(),
      prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true } } },
      }),
      prisma.user.findMany({
        where: { role: { in: ['STUDENT', 'ALUMNI'] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          branch: true,
          graduationYear: true,
          createdAt: true,
        },
      }),
    ]);

    res.render('admin/dashboard', {
      user: req.user,
      currentPath: '/admin',
      stats,
      recentNotices,
      recentStudents,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('admin/dashboard', {
      user: req.user,
      currentPath: '/admin',
      stats: EMPTY_ADMIN_STATS,
      recentNotices: [],
      recentStudents: [],
      loadError: 'Some dashboard data could not be loaded.',
    });
  }
};

/**
 * GET /admin/notices
 * Post new announcements and remove outdated ones.
 */
const adminNotices = async (req, res) => {
  try {
    const notices = await prisma.notification.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });

    res.render('admin/manage-notices', {
      user: req.user,
      currentPath: '/admin/notices',
      notices,
    });
  } catch (error) {
    console.error('Admin notices error:', error);
    res.render('admin/manage-notices', {
      user: req.user,
      currentPath: '/admin/notices',
      notices: [],
      loadError: 'Could not load the notice list.',
    });
  }
};

/**
 * GET /admin/companies
 * Add upcoming recruiters and edit existing company profiles.
 */
const adminCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      take: 200,
      orderBy: { name: 'asc' },
      include: { _count: { select: { experiences: true } } },
    });

    res.render('admin/manage-companies', {
      user: req.user,
      currentPath: '/admin/companies',
      companies,
    });
  } catch (error) {
    console.error('Admin companies error:', error);
    res.render('admin/manage-companies', {
      user: req.user,
      currentPath: '/admin/companies',
      companies: [],
      loadError: 'Could not load the company list.',
    });
  }
};

/**
 * GET /admin/students
 * Registered student roster with filters.
 */
const adminStudents = async (req, res) => {
  const search = req.query.search || '';
  const branch = req.query.branch || '';
  const graduationYear = req.query.graduationYear || '';

  try {
    const where = { role: { in: ['STUDENT', 'ALUMNI'] } };
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

    const [students, total, branches] = await Promise.all([
      prisma.user.findMany({
        where,
        take: 200,
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
          _count: { select: { experiences: true } },
        },
      }),
      prisma.user.count({ where }),
      // Branch values already in use, for the filter dropdown.
      prisma.user.findMany({
        where: { role: { in: ['STUDENT', 'ALUMNI'] }, branch: { not: null } },
        distinct: ['branch'],
        select: { branch: true },
        orderBy: { branch: 'asc' },
      }),
    ]);

    res.render('admin/students', {
      user: req.user,
      currentPath: '/admin/students',
      students,
      total,
      branches: branches.map((b) => b.branch).filter(Boolean),
      filters: { search, branch, graduationYear },
    });
  } catch (error) {
    console.error('Admin students error:', error);
    res.render('admin/students', {
      user: req.user,
      currentPath: '/admin/students',
      students: [],
      total: 0,
      branches: [],
      filters: { search, branch, graduationYear },
      loadError: 'Could not load the student roster.',
    });
  }
};

module.exports = {
  landing,
  loginPage,
  registerPage,
  dashboard,
  companiesList,
  companyDetail,
  prepHub,
  experiencesList,
  newExperiencePage,
  experienceDetail,
  atsScanner,
  roadmapPage,
  logout,
  adminDashboard,
  adminNotices,
  adminCompanies,
  adminStudents,
};
