const { validationResult } = require("express-validator");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User.model");

const hasCurrentMonthlyBadge = (user, date = new Date()) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return (user?.badges || []).some((badge) => {
    const type = badge.type || "good_citizen_monthly";
    return (
      type === "good_citizen_monthly" &&
      badge.awardMonth === month &&
      badge.awardYear === year
    );
  });
};

// Helper: send token as HTTP-only cookie + JSON response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateToken();

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Update last login
  user.lastLogin = new Date();
  user.save({ validateBeforeSave: false });

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      data: {
        user,
        token,
      },
      message:
        statusCode === 201
          ? "Account created successfully"
          : "Logged in successfully",
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
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const {
      name,
      email,
      password,
      phone,
      role,
      department,
      employeeId,
      governmentEmail,
      designation,
      nidNumber,
      presentAddress,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Build user data — only include public servant fields if role is department_officer
    const userData = { name, email, password, phone };

    // Set presentAddress if provided
    if (presentAddress && typeof presentAddress === "object") {
      userData.presentAddress = {
        address: presentAddress.address || "",
        lat: presentAddress.lat ? Number(presentAddress.lat) : null,
        lng: presentAddress.lng ? Number(presentAddress.lng) : null,
      };
    }

    if (role === "department_officer") {
      if (!nidNumber || String(nidNumber).length !== 10) {
        return res.status(400).json({
          success: false,
          message: "NID number must be exactly 10 digits.",
        });
      }
      userData.role = "department_officer";
      userData.department = department;
      userData.employeeId = employeeId;
      userData.governmentEmail = governmentEmail;
      userData.designation = designation;
      userData.isVerified = false;
      userData.isActive = false; // Public servants need admin approval
      userData.verificationDoc = {
        docType: "nid",
        documentNumber: String(nidNumber),
        status: "pending",
        submittedAt: new Date(),
      };
    } else if (role === "mayor") {
      userData.role = "mayor";
      userData.isVerified = false;
      userData.isActive = false; // Mayors need admin approval
      userData.employeeId = employeeId;
      userData.governmentEmail = governmentEmail;
      userData.designation = designation;
      userData.verificationDoc = {
        docType: "nid",
        documentNumber: String(nidNumber || ""),
        status: "pending",
        submittedAt: new Date(),
      };
    }
    // Note: 'admin' role cannot be self-assigned via signup

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
        message: "Validation failed",
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account is inactive. Please wait for admin approval.",
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
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
    .cookie("token", "", { httpOnly: true, expires: new Date(0) })
    .json({
      success: true,
      message: "Logged out successfully",
    });
};

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const shouldBeCurrentWinner =
      user?.role === "citizen" ? hasCurrentMonthlyBadge(user) : false;

    if (user && user.isGoodCitizen !== shouldBeCurrentWinner) {
      user.isGoodCitizen = shouldBeCurrentWinner;
      await user.save({ validateBeforeSave: false });
    }

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
        message: "Please provide current and new password.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters.",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully.",
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
        message: "Please provide document type and number.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a copy of your document.",
      });
    }

    // Digit validation
    if (docType === "nid" && documentNumber.length !== 10) {
      return res
        .status(400)
        .json({ success: false, message: "NID must be exactly 10 digits." });
    }
    if (docType === "birth_certificate" && documentNumber.length !== 17) {
      return res.status(400).json({
        success: false,
        message: "Birth Certificate number must be exactly 17 digits.",
      });
    }
    if (docType === "passport" && documentNumber.length !== 9) {
      return res.status(400).json({
        success: false,
        message: "Passport number must be exactly 9 characters.",
      });
    }

    const user = await User.findById(req.user.id);
    user.isVerified = false;
    user.verificationDoc = {
      docType,
      documentNumber,
      fileUrl: `/uploads/verification/${req.file.filename}`,
      status: "pending",
      submittedAt: new Date(),
      verifiedAt: undefined,
      rejectionReason: undefined,
    };

    // Ensure Mongoose detects the object change
    user.markModified("verificationDoc");
    await user.save();

    res.json({
      success: true,
      message: "Verification submitted successfully. It is now pending admin review.",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// ─── OAuth Callback (Google & Facebook) ──────────────────────────────
// Called after Passport successfully authenticates the user
const oauthCallback = (req, res) => {
  const token = req.user.generateToken();
  req.user.lastLogin = new Date();
  req.user.save({ validateBeforeSave: false });

  // Check if user is new and needs verification
  const isNewOAuthUser = req.user.isNewOAuthUser || false;

  // Redirect to completion page - let frontend decide verification flow
  res.redirect(
    `${process.env.CLIENT_URL}/auth/oauth-completion?token=${token}&isNew=${isNewOAuthUser}`,
  );
};

// ─── POST /api/v1/auth/forgot-password ───────────────────────────────
const forgotPassword = async (req, res, next) => {
  let user;
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide your email." });
    }

    user = await User.findOne({ email });

    // Always respond the same to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: "If that email is registered, a reset link has been sent.",
      });
    }

    if (user.authProvider !== "local") {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.authProvider} sign-in. Please log in with ${user.authProvider} instead.`,
      });
    }

    // Generate raw token, store its hash in DB
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Somadhan" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset - Somadhan",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">Reset your password</h2>
          <p style="color: #64748b;">You requested a password reset for your Somadhan account. Click the button below to set a new password.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:13px;">This link expires in <strong>30 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (error) {
    // Clear tokens on failure so user can retry
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    next(error);
  }
};

// ─── PUT /api/v1/auth/reset-password/:token ───────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    // Hash the incoming token and look it up
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired.",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/v1/auth/update-phone ────────────────────────────────────
const updatePhone = async (req, res, next) => {
  try {
    const { phone, currentPassword } = req.body;

    if (!phone || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Phone number and current password are required.",
      });
    }

    if (!/^(\+880|0)?1[3-9]\d{8}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid BD phone number.",
      });
    }

    const user = await User.findById(req.user.id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect." });
    }

    user.phone = phone;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: "Phone number updated successfully.",
      data: { phone },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/v1/auth/update-avatar ───────────────────────────────────
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file provided." });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl });

    res.json({
      success: true,
      message: "Profile picture updated.",
      data: { avatar: avatarUrl },
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/v1/auth/avatar ───────────────────────────────────────
const deleteAvatar = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { avatar: "" });
    res.json({ success: true, message: "Profile picture removed." });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/v1/auth/update-address ──────────────────────────────────
const updateAddress = async (req, res, next) => {
  try {
    const { address, lat, lng } = req.body;

    if (!address) {
      return res
        .status(400)
        .json({ success: false, message: "Address is required." });
    }

    const user = await User.findById(req.user.id);
    user.presentAddress = {
      address,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
    };

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: "Present address updated successfully.",
      data: { presentAddress: user.presentAddress },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/auth/verify-oauth ───────────────────────────────────
// Endpoint for new OAuth users to complete verification
const verifyOAuthAccount = async (req, res, next) => {
  try {
    const { docType, documentNumber, phone } = req.body;

    if (!docType || !documentNumber) {
      return res.status(400).json({
        success: false,
        message: "Please provide document type and number.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a copy of your document.",
      });
    }

    // Digit validation
    if (docType === "nid" && documentNumber.length !== 10) {
      return res
        .status(400)
        .json({ success: false, message: "NID must be exactly 10 digits." });
    }
    if (docType === "birth_certificate" && documentNumber.length !== 17) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Birth Certificate number must be exactly 17 digits.",
        });
    }
    if (docType === "passport" && documentNumber.length !== 9) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Passport number must be exactly 9 characters.",
        });
    }

    const user = await User.findById(req.user.id);

    // Update phone if provided
    if (phone) {
      if (!/^(\+880|0)?1[3-9]\d{8}$/.test(phone)) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Please enter a valid BD phone number.",
          });
      }
      user.phone = phone;
    }

    // Submit verification for admin review
    user.isVerified = false;
    user.verificationDoc = {
      docType,
      documentNumber,
      fileUrl: `/uploads/verification/${req.file.filename}`,
      status: "pending",
      submittedAt: new Date(),
      verifiedAt: undefined,
      rejectionReason: undefined,
    };

    user.markModified("verificationDoc");
    await user.save();

    res.json({
      success: true,
      message: "Verification submitted successfully. Your account is pending admin review.",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
  verifyAccount,
  verifyOAuthAccount,
  oauthCallback,
  forgotPassword,
  resetPassword,
  updatePhone,
  updateAvatar,
  deleteAvatar,
  updateAddress,
};
