// ============================================
// Multer File Upload Middleware (Memory Storage)
// ============================================
// Uses memoryStorage because Vercel has an ephemeral, read-only
// file system. Files are held in req.file.buffer.

const multer = require('multer');

const storage = multer.memoryStorage();

/**
 * File filter — only allows PDF files.
 */
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'), false);
  }
};

/**
 * Configured multer instance for PDF uploads.
 * - Storage: memory (buffer)
 * - Max file size: 5 MB
 * - Single file field: 'resume'
 */
const uploadResume = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single('resume');

/**
 * Wrapper middleware with cleaner error handling for multer errors.
 */
const handleUpload = (req, res, next) => {
  uploadResume(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5 MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

module.exports = { handleUpload };
