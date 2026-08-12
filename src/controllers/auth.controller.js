// ============================================
// Auth Controller
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { asyncHandler, successResponse } = require('../utils/helpers');

/**
 * POST /api/auth/register
 * Register a new user.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, college, branch, graduationYear } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'STUDENT',
      college,
      branch,
      graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      college: true,
      branch: true,
      graduationYear: true,
      createdAt: true,
    },
  });

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  successResponse(res, {
    statusCode: 201,
    message: 'Registration successful.',
    data: { user, token },
  });
});

/**
 * POST /api/auth/login
 * Login with email and password.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  successResponse(res, {
    message: 'Login successful.',
    data: { user: userWithoutPassword, token },
  });
});

/**
 * GET /api/auth/profile
 * Get current user's profile.
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      college: true,
      branch: true,
      graduationYear: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          experiences: true,
          atsScans: true,
        },
      },
    },
  });

  successResponse(res, { data: user });
});

/**
 * PUT /api/auth/profile
 * Update current user's profile.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, college, branch, graduationYear, password } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (college !== undefined) updateData.college = college;
  if (branch !== undefined) updateData.branch = branch;
  if (graduationYear !== undefined)
    updateData.graduationYear = graduationYear ? parseInt(graduationYear, 10) : null;

  // Allow password change
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }
    const salt = await bcrypt.genSalt(12);
    updateData.password = await bcrypt.hash(password, salt);
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      college: true,
      branch: true,
      graduationYear: true,
      updatedAt: true,
    },
  });

  successResponse(res, {
    message: 'Profile updated successfully.',
    data: user,
  });
});

module.exports = { register, login, getProfile, updateProfile };
