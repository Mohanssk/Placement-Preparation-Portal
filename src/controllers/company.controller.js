// ============================================
// Company Controller
// ============================================

const prisma = require('../config/database');
const {
  asyncHandler,
  successResponse,
  parsePagination,
  paginatedResponse,
} = require('../utils/helpers');

/**
 * GET /api/companies
 * List all companies with pagination and search.
 */
const getCompanies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search } = req.query;

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

  res.json(paginatedResponse({ data: companies, total, page, limit }));
});

/**
 * GET /api/companies/:id
 * Get a single company by ID.
 */
const getCompany = asyncHandler(async (req, res) => {
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
    return res.status(404).json({
      success: false,
      message: 'Company not found.',
    });
  }

  successResponse(res, { data: company });
});

/**
 * POST /api/companies
 * Create a new company (Admin only).
 */
const createCompany = asyncHandler(async (req, res) => {
  const {
    name, description, website, rolesHired,
    eligibilityCriteria, minCGPA, allowedBranches,
  } = req.body;

  const company = await prisma.company.create({
    data: {
      name,
      description,
      website,
      rolesHired: rolesHired || [],
      eligibilityCriteria,
      minCGPA: minCGPA ? parseFloat(minCGPA) : null,
      allowedBranches: allowedBranches || [],
    },
  });

  successResponse(res, {
    statusCode: 201,
    message: 'Company created successfully.',
    data: company,
  });
});

/**
 * PUT /api/companies/:id
 * Update a company (Admin only).
 */
const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name, description, website, rolesHired,
    eligibilityCriteria, minCGPA, allowedBranches,
  } = req.body;

  // Check exists
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Company not found.',
    });
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (website !== undefined) updateData.website = website;
  if (rolesHired !== undefined) updateData.rolesHired = rolesHired;
  if (eligibilityCriteria !== undefined) updateData.eligibilityCriteria = eligibilityCriteria;
  if (minCGPA !== undefined) updateData.minCGPA = minCGPA ? parseFloat(minCGPA) : null;
  if (allowedBranches !== undefined) updateData.allowedBranches = allowedBranches;

  const company = await prisma.company.update({
    where: { id },
    data: updateData,
  });

  successResponse(res, {
    message: 'Company updated successfully.',
    data: company,
  });
});

/**
 * DELETE /api/companies/:id
 * Delete a company (Admin only).
 */
const deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Company not found.',
    });
  }

  await prisma.company.delete({ where: { id } });

  successResponse(res, { message: 'Company deleted successfully.' });
});

module.exports = {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
};
