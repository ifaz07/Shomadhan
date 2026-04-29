const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One volunteer record per user
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
    },
    address: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    latitude: Number,
    longitude: Number,
    
    // Volunteer Profile Info
    skills: [
      {
        type: String,
        enum: [
          'construction',
          'cleaning',
          'first_aid',
          'education',
          'counseling',
          'driving',
          'technical_support',
          'community_outreach',
          'documentation',
          'other',
        ],
      },
    ],
    availability: {
      type: String,
      enum: ['full_time', 'part_time', 'weekends_only', 'flexible'],
      default: 'part_time',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    profileImage: {
      type: String,
      default: null,
    },
    
    // Volunteer Status & Verification
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'suspended'],
      default: 'pending',
    },
    verificationDocument: {
      url: String,
      type: String,
      uploadedAt: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who verified
    },
    verificationDate: Date,
    
    // Activity Tracking
    activeAnnouncements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CivicAnnouncement',
      },
    ],
    completedActivities: {
      type: Number,
      default: 0,
    },
    hoursContributed: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    
    // Terms & Consent
    agreedToTerms: {
      type: Boolean,
      default: false,
    },
    backgroundCheck: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      completedAt: Date,
    },
  },
  { timestamps: true }
);

// Index for location-based queries
volunteerSchema.index({ latitude: '2d', longitude: '2d' });

module.exports = mongoose.model('Volunteer', volunteerSchema);
