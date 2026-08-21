// ============================================
// Notification Controller
// ============================================

const prisma = require('../config/database');
const {
  asyncHandler,
  successResponse,
  parsePagination,
  paginatedResponse,
} = require('../utils/helpers');

/**
 * GET /api/notifications
 * Public notice board feed (paginated, newest first).
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type } = req.query;

  const where = {};
  if (type) where.type = type;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  res.json(paginatedResponse({ data: notifications, total, page, limit }));
});

/**
 * GET /api/notifications/:id
 * Get a single notification.
 */
const getNotification = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found.',
    });
  }

  successResponse(res, { data: notification });
});

/**
 * POST /api/notifications
 * Create a placement alert (Admin only).
 */
const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type, companyName, eventDate, targetBatch } = req.body;

  const notification = await prisma.notification.create({
    data: {
      title,
      message,
      type: type || 'GENERAL',
      companyName,
      eventDate: eventDate ? new Date(eventDate) : null,
      targetBatch: targetBatch ? String(targetBatch).trim() : null,
      authorId: req.user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  successResponse(res, {
    statusCode: 201,
    message: 'Notification created successfully.',
    data: notification,
  });
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification (Admin only).
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found.',
    });
  }

  await prisma.notification.delete({ where: { id } });

  successResponse(res, { message: 'Notification deleted successfully.' });
});

module.exports = {
  getNotifications,
  getNotification,
  createNotification,
  deleteNotification,
};
