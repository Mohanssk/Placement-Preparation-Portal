// ============================================
// Preparation Resource Controller
// ============================================

const prisma = require('../config/database');
const {
  asyncHandler,
  successResponse,
  parsePagination,
  paginatedResponse,
} = require('../utils/helpers');

/**
 * GET /api/resources
 * List resources, optionally filtered by category.
 */
const getResources = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, search } = req.query;

  const where = {};
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { platform: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [resources, total] = await Promise.all([
    prisma.prepResource.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.prepResource.count({ where }),
  ]);

  res.json(paginatedResponse({ data: resources, total, page, limit }));
});

/**
 * GET /api/resources/:id
 * Get a single resource.
 */
const getResource = asyncHandler(async (req, res) => {
  const resource = await prisma.prepResource.findUnique({
    where: { id: req.params.id },
  });

  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found.',
    });
  }

  successResponse(res, { data: resource });
});

/**
 * POST /api/resources
 * Create a resource (Admin only).
 */
const createResource = asyncHandler(async (req, res) => {
  const { title, description, url, category, platform, sortOrder } = req.body;

  const resource = await prisma.prepResource.create({
    data: {
      title,
      description,
      url,
      category,
      platform,
      sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
    },
  });

  successResponse(res, {
    statusCode: 201,
    message: 'Resource created successfully.',
    data: resource,
  });
});

/**
 * PUT /api/resources/:id
 * Update a resource (Admin only).
 */
const updateResource = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, url, category, platform, sortOrder } = req.body;

  const existing = await prisma.prepResource.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found.',
    });
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (url !== undefined) updateData.url = url;
  if (category !== undefined) updateData.category = category;
  if (platform !== undefined) updateData.platform = platform;
  if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder, 10);

  const resource = await prisma.prepResource.update({
    where: { id },
    data: updateData,
  });

  successResponse(res, {
    message: 'Resource updated successfully.',
    data: resource,
  });
});

/**
 * DELETE /api/resources/:id
 * Delete a resource (Admin only).
 */
const deleteResource = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.prepResource.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found.',
    });
  }

  await prisma.prepResource.delete({ where: { id } });

  successResponse(res, { message: 'Resource deleted successfully.' });
});

module.exports = {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
};
