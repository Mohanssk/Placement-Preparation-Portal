// ============================================
// Pagination & Response Helpers
// ============================================

/**
 * Parses pagination parameters from query string.
 *
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Builds a standardized paginated response.
 *
 * @param {object} params
 * @param {Array} params.data - The records
 * @param {number} params.total - Total record count
 * @param {number} params.page - Current page
 * @param {number} params.limit - Page size
 * @returns {object} Paginated API response
 */
const paginatedResponse = ({ data, total, page, limit }) => {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Wraps an async route handler to catch errors and forward to errorHandler.
 *
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Wrapped middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Builds a success response.
 *
 * @param {object} res - Express response
 * @param {object} params
 * @param {number} [params.statusCode=200]
 * @param {string} [params.message='Success']
 * @param {*} [params.data]
 */
const successResponse = (res, { statusCode = 200, message = 'Success', data } = {}) => {
  const response = { success: true, message };
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
};

module.exports = {
  parsePagination,
  paginatedResponse,
  asyncHandler,
  successResponse,
};
