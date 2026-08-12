// ============================================
// ATS Analyzer Controller
// ============================================

const prisma = require('../config/database');
const { analyzeResume } = require('../utils/atsAnalyzer');
const {
  asyncHandler,
  successResponse,
  parsePagination,
  paginatedResponse,
} = require('../utils/helpers');

/**
 * POST /api/ats/analyze
 * Accept a PDF resume and JD text, return ATS match analysis.
 * File is uploaded via multer memoryStorage → req.file.buffer
 */
const analyze = asyncHandler(async (req, res) => {
  // Validate file
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a PDF resume file.',
    });
  }

  // Validate JD text
  const { jobDescription } = req.body;
  if (!jobDescription || jobDescription.trim().length < 20) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a job description (at least 20 characters).',
    });
  }

  // Run analysis
  const result = await analyzeResume(req.file.buffer, jobDescription);

  // Save scan to database
  const scan = await prisma.atsScan.create({
    data: {
      userId: req.user.id,
      fileName: req.file.originalname,
      matchScore: result.matchScore,
      foundKeywords: result.foundKeywords,
      missingKeywords: result.missingKeywords,
      categoryBreakdown: result.categoryBreakdown,
      jobDescription: jobDescription.substring(0, 5000), // cap storage
    },
  });

  successResponse(res, {
    statusCode: 200,
    message: 'Resume analysis complete.',
    data: {
      scanId: scan.id,
      fileName: req.file.originalname,
      matchScore: result.matchScore,
      totalKeywords: result.totalKeywords,
      foundCount: result.foundCount,
      missingCount: result.missingCount,
      foundKeywords: result.foundKeywords,
      missingKeywords: result.missingKeywords,
      categoryBreakdown: result.categoryBreakdown,
      resumeWordCount: result.resumeWordCount,
      pdfPages: result.pdfPages,
    },
  });
});

/**
 * GET /api/ats/history
 * Get current user's scan history.
 */
const getHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const where = { userId: req.user.id };

  const [scans, total] = await Promise.all([
    prisma.atsScan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        matchScore: true,
        createdAt: true,
      },
    }),
    prisma.atsScan.count({ where }),
  ]);

  res.json(paginatedResponse({ data: scans, total, page, limit }));
});

/**
 * GET /api/ats/history/:id
 * Get a single scan result (must belong to current user).
 */
const getScan = asyncHandler(async (req, res) => {
  const scan = await prisma.atsScan.findUnique({
    where: { id: req.params.id },
  });

  if (!scan) {
    return res.status(404).json({
      success: false,
      message: 'Scan not found.',
    });
  }

  // Only the owner can view their scans
  if (scan.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'You can only view your own scan history.',
    });
  }

  successResponse(res, { data: scan });
});

module.exports = { analyze, getHistory, getScan };
