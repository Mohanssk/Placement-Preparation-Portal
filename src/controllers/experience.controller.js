// ============================================
// Interview Experience Controller
// ============================================

const prisma = require('../config/database');
const {
  asyncHandler,
  successResponse,
  parsePagination,
  paginatedResponse,
} = require('../utils/helpers');

/**
 * GET /api/experiences
 * List experiences with filtering (company, outcome, tags) and pagination.
 */
const getExperiences = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { companyId, outcome, tag, search } = req.query;

  const where = {};
  if (companyId) where.companyId = companyId;
  if (outcome) where.outcome = outcome;
  if (tag) {
    where.tags = { some: { name: { equals: tag, mode: 'insensitive' } } };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [experiences, total] = await Promise.all([
    prisma.interviewExperience.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, college: true, branch: true } },
        company: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true } },
      },
    }),
    prisma.interviewExperience.count({ where }),
  ]);

  res.json(paginatedResponse({ data: experiences, total, page, limit }));
});

/**
 * GET /api/experiences/:id
 * Get a single experience with full details.
 */
const getExperience = asyncHandler(async (req, res) => {
  const experience = await prisma.interviewExperience.findUnique({
    where: { id: req.params.id },
    include: {
      author: { select: { id: true, name: true, college: true, branch: true, graduationYear: true } },
      company: { select: { id: true, name: true, website: true } },
      tags: { select: { id: true, name: true } },
    },
  });

  if (!experience) {
    return res.status(404).json({
      success: false,
      message: 'Interview experience not found.',
    });
  }

  successResponse(res, { data: experience });
});

/**
 * POST /api/experiences
 * Create an interview experience (Student or Alumni).
 */
const createExperience = asyncHandler(async (req, res) => {
  const { title, content, outcome, role, yearOfInterview, rounds, companyId, tags } = req.body;

  // Verify company exists
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return res.status(404).json({
      success: false,
      message: 'Company not found. Please create the company first.',
    });
  }

  const experience = await prisma.interviewExperience.create({
    data: {
      title,
      content,
      outcome: outcome || 'PENDING',
      role,
      yearOfInterview: yearOfInterview ? parseInt(yearOfInterview, 10) : null,
      rounds: rounds || [],
      authorId: req.user.id,
      companyId,
      tags: tags && tags.length > 0
        ? {
            create: tags.map((tagName) => ({ name: tagName.trim() })),
          }
        : undefined,
    },
    include: {
      author: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true } },
    },
  });

  successResponse(res, {
    statusCode: 201,
    message: 'Interview experience created successfully.',
    data: experience,
  });
});

/**
 * PUT /api/experiences/:id
 * Update an experience (Author or Admin only).
 */
const updateExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, outcome, role, yearOfInterview, rounds, tags } = req.body;

  // Check exists & ownership
  const existing = await prisma.interviewExperience.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Interview experience not found.',
    });
  }

  // Only author or admin can update
  if (existing.authorId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'You can only edit your own posts.',
    });
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (outcome !== undefined) updateData.outcome = outcome;
  if (role !== undefined) updateData.role = role;
  if (yearOfInterview !== undefined)
    updateData.yearOfInterview = yearOfInterview ? parseInt(yearOfInterview, 10) : null;
  if (rounds !== undefined) updateData.rounds = rounds;

  // Handle tags: delete old ones and create new ones
  if (tags !== undefined) {
    await prisma.experienceTag.deleteMany({ where: { experienceId: id } });
    if (tags.length > 0) {
      updateData.tags = {
        create: tags.map((tagName) => ({ name: tagName.trim() })),
      };
    }
  }

  const experience = await prisma.interviewExperience.update({
    where: { id },
    data: updateData,
    include: {
      author: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true } },
    },
  });

  successResponse(res, {
    message: 'Interview experience updated successfully.',
    data: experience,
  });
});

/**
 * DELETE /api/experiences/:id
 * Delete an experience (Author or Admin only).
 */
const deleteExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.interviewExperience.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Interview experience not found.',
    });
  }

  if (existing.authorId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own posts.',
    });
  }

  await prisma.interviewExperience.delete({ where: { id } });

  successResponse(res, { message: 'Interview experience deleted successfully.' });
});

module.exports = {
  getExperiences,
  getExperience,
  createExperience,
  updateExperience,
  deleteExperience,
};
