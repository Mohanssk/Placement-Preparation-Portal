// ============================================
// Views Controller — SSR Page Rendering
// ============================================
// Queries the database and renders EJS templates.
// All data bindings match the Prisma schema exactly.

const prisma = require('../config/database');

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

module.exports = {
  landing,
  loginPage,
  registerPage,
  dashboard,
  companiesList,
  companyDetail,
  prepHub,
  experiencesList,
  experienceDetail,
  atsScanner,
  logout,
};
