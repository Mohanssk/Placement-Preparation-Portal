// ============================================
// Resume Asset Controller
// ============================================

const prisma = require('../config/database');
const {
  asyncHandler,
  successResponse,
  parsePagination,
  paginatedResponse,
} = require('../utils/helpers');

/**
 * GET /api/assets
 * List assets, optionally filtered by type (TEMPLATE / ACTION_WORDS).
 */
const getAssets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type } = req.query;

  const where = {};
  if (type) where.type = type;

  const [assets, total] = await Promise.all([
    prisma.resumeAsset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.resumeAsset.count({ where }),
  ]);

  res.json(paginatedResponse({ data: assets, total, page, limit }));
});

/**
 * GET /api/assets/:id
 * Get a single asset.
 */
const getAsset = asyncHandler(async (req, res) => {
  const asset = await prisma.resumeAsset.findUnique({
    where: { id: req.params.id },
  });

  if (!asset) {
    return res.status(404).json({
      success: false,
      message: 'Asset not found.',
    });
  }

  successResponse(res, { data: asset });
});

/**
 * POST /api/assets
 * Create an asset entry (Admin only).
 */
const createAsset = asyncHandler(async (req, res) => {
  const { title, type, description, fileUrl, content } = req.body;

  const asset = await prisma.resumeAsset.create({
    data: {
      title,
      type,
      description,
      fileUrl,
      content: content || null,
    },
  });

  successResponse(res, {
    statusCode: 201,
    message: 'Asset created successfully.',
    data: asset,
  });
});

/**
 * PUT /api/assets/:id
 * Update an asset (Admin only).
 */
const updateAsset = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, type, description, fileUrl, content } = req.body;

  const existing = await prisma.resumeAsset.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Asset not found.',
    });
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (type !== undefined) updateData.type = type;
  if (description !== undefined) updateData.description = description;
  if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
  if (content !== undefined) updateData.content = content;

  const asset = await prisma.resumeAsset.update({
    where: { id },
    data: updateData,
  });

  successResponse(res, {
    message: 'Asset updated successfully.',
    data: asset,
  });
});

/**
 * DELETE /api/assets/:id
 * Delete an asset (Admin only).
 */
const deleteAsset = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.resumeAsset.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Asset not found.',
    });
  }

  await prisma.resumeAsset.delete({ where: { id } });

  successResponse(res, { message: 'Asset deleted successfully.' });
});

module.exports = {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
};
