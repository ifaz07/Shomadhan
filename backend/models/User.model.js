const mongoose = require('mongoose');
const { DEPARTMENT_KEYS } = require('../utils/departmentTaxonomy');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      // Not required for OAuth users (google/facebook)
      required: function () {
        return this.authProvider === 'local';
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    phone: {
      type: String,
      trim: true,
      match: [/^(\+880|0)?1[3-9]\d{8}$/, 'Please provide a valid BD phone number'],
    },
    points: {
      type: Number,
      default: 0,
    },
    pointHistory: [
      {
        amount: Number,
        reason: String,
        type: { type: String, enum: ['earn', 'penalty'] },
        complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    isGoodCitizen: {
      type: Boolean,
      default: false,
    },
    badges: [
      {
        type: { type: String, default: 'good_citizen_monthly' },
        name: { type: String },
        awardedAt: { type: Date, default: Date.now },
        awardMonth: { type: Number, min: 1, max: 12 },
        awardYear: { type: Number },
        monthKey: { type: String },
        awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    role: {
      type: String,
      enum: ['citizen', 'department_officer', 'admin', 'mayor'],
      default: 'citizen',
    },
    avatar: {
      type: String,
      default: '',
    },

    // ─── Public Servant Fields (only for department_officer role) ───
    department: {
      type: String,
      enum: DEPARTMENT_KEYS,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    governmentEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },

    // ─── Identity Verification (separate from signup) ──────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDoc: {
      docType: {
        type: String,
        enum: ['nid', 'passport', 'birth_certificate'],
      },
      documentNumber: String,
      fileUrl: String, // Cloudinary URL
      submittedAt: Date,
      verifiedAt: Date,
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      rejectionReason: String,
    },

    // ─── OAuth Providers ─────────────────────────────────────────
    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },

    // ─── Reputation & Badges ─────────────────────────────────────
    reputation: { type: Number, default: 0 },

    // ─── Password Reset ──────────────────────────────────────────
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },

    // ─── Account State ───────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    fcmToken: { type: String, default: null },
    presentAddress: {
      address: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// ─── Hash password before saving ─────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Compare password method ─────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Generate JWT ────────────────────────────────────────────────────
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ─── Strip sensitive fields from JSON output ─────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
