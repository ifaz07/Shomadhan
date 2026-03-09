const { validationResult } = require('express-validator');
const User = require('../models/User.model');

// Helper: send token as HTTP-only cookie + JSON response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateToken();

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Update last login
  user.lastLogin = new Date();
  user.save({ validateBeforeSave: false });

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      data: {
        user,
        token,
      },
      message: statusCode === 201 ? 'Account created successfully' : 'Logged in successfully',
    });
};

// ─── POST /api/v1/auth/register ──────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, password, phone, role, department, employeeId, governmentEmail, designation } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Build user data — only include public servant fields if role is department_officer
    const userData = { name, email, password, phone };

    if (role === 'department_officer') {
      userData.role = 'department_officer';
      userData.department = department;
      userData.employeeId = employeeId;
      userData.governmentEmail = governmentEmail;
      userData.designation = designation;
    }
    // Note: 'admin' and 'mayor' roles cannot be self-assigned via signup

    const user = await User.create(userData);

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/auth/login ─────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Contact support.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/auth/logout ────────────────────────────────────────
const logout = async (req, res) => {
  res
    .status(200)
    .cookie('token', '', { httpOnly: true, expires: new Date(0) })
    .json({
      success: true,
      message: 'Logged out successfully',
    });
};

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/v1/auth/change-password ─────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/v1/auth/verify ──────────────────────────────────────────
const verifyAccount = async (req, res, next) => {
  try {
    const { docType, documentNumber } = req.body;

    if (!docType || !documentNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide document type and number.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a copy of your document.',
      });
    }

    // Digit validation
    if (docType === 'nid' && documentNumber.length !== 10) {
      return res.status(400).json({ success: false, message: 'NID must be exactly 10 digits.' });
    }
    if (docType === 'birth_certificate' && documentNumber.length !== 17) {
      return toast.error('Birth Certificate number must be exactly 17 digits.');
    }
    if (docType === 'passport' && documentNumber.length !== 9) {
      return res.status(400).json({ success: false, message: 'Passport number must be exactly 9 characters.' });
    }

    const user = await User.findById(req.user.id);
    user.isVerified = true;
    user.verificationDoc = {
      docType,
      documentNumber,
      fileUrl: `/uploads/verification/${req.file.filename}`,
      status: 'approved',
      submittedAt: new Date(),
      verifiedAt: new Date(),
    };

    // Ensure Mongoose detects the object change
    user.markModified('verificationDoc');
    await user.save();

    res.json({
      success: true,
      message: 'Account verified successfully!',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, logout, getMe, changePassword, verifyAccount };
