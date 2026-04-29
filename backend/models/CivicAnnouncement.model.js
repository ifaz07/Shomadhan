const mongoose = require('mongoose');

const civicAnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    category: {
      type: String,
      enum: [
        'volunteer_request',
        'community_service',
        'public_notice',
        'emergency_alert',
        'educational_program',
        'health_initiative',
        'infrastructure_project',
        'event_announcement',
        'other',
      ],
      required: true,
    },
    
    // Author Info
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Must be mayor or authority
    },
    department: {
      type: String,
      enum: [
        'public_works',
        'water_authority',
        'electricity',
        'sanitation',
        'public_safety',
        'animal_control',
        'mayor_office',
        'general',
      ],
    },
    
    // Visibility & Status
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'pinned'],
      default: 'draft',
    },
    publishedAt: Date,
    expiresAt: Date,
    
    // Media
    imageUrl: String,
    videoUrl: String,
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
      },
    ],
    
    // For Volunteer Requests
    volunteersNeeded: {
      type: Number,
      default: 0,
    },
    requiredSkills: [String],
    eventLocation: String,
    eventDate: Date,
    eventEndDate: Date,
    eventTime: String,
    registeredVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Volunteer',
      },
    ],
    
    // Engagement Metrics
    viewCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    interactionCount: {
      type: Number,
      default: 0,
    },
    
    // Location-based targeting
    targetDistricts: [String],
    latitude: Number,
    longitude: Number,
    
    // Comments/Updates
    updates: [
      {
        message: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
  },
  { timestamps: true }
);

// Index for search and filtering
civicAnnouncementSchema.index({ status: 1, createdAt: -1 });
civicAnnouncementSchema.index({ category: 1, status: 1 });
civicAnnouncementSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model('CivicAnnouncement', civicAnnouncementSchema);
