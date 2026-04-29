const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true,
  },
  publicId: {
    type: String,
  },
});

// SLA Configuration by priority (in hours)
const SLA_CONFIG = {
  Critical: 4,    // 4 hours for critical issues
  High: 24,       // 24 hours for high priority
  Medium: 72,     // 72 hours (3 days) for medium
  Low: 168,       // 168 hours (7 days) for low priority
};

// Escalation levels
const ESCALATION_LEVELS = ['initial', 'level1', 'level2', 'level3', 'mayor'];

const complaintSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },
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
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Road', 'Waste', 'Electricity', 'Water', 'Safety', 'Environment', 'Other'],
    },
    evidence: [evidenceSchema],
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return !this.isAnonymous;
      },
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved', 'rejected'],
      default: 'pending',
    },
    location: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },

    // ── Priority System ─────────────────────────────────────────────────
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Low',
    },
    emergencyFlag: {
      type: Boolean,
      default: false,
    },

    // ── Public Voting ────────────────────────────────────────────────────
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    voteCount: {
      type: Number,
      default: 0,
    },

    history: [
      {
        status: String,
        message: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    nlpAnalysis: {
      suggestedCategory: { type: String },
      suggestedDepartment: {
        name: { type: String },
        key: { type: String },
      },
      keywords: [{ type: String }],
      confidence: { type: Number },
      source: { type: String },
      analyzedAt: { type: Date },
    },
    spamCheck: {
      isDuplicate: { type: Boolean, default: false },
      similarTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
      originalTicketId: { type: String },
      similarity: { type: Number },
      method: { type: String },
      checkedAt: { type: Date },
    },

    // ── AI-Based Prank/Fake Detection ───────────────────────────────────
    prankDetection: {
      isPrank: { type: Boolean, default: false },
      confidence: { type: Number },  // 0-1 confidence score
      reasons: [{ type: String }],   // List of reasons for flagging
      modelVersion: { type: String }, // AI model version used
      analyzedAt: { type: Date },
    },

    // ── SLA & Escalation System ─────────────────────────────────────────
    sla: {
      deadline: { type: Date },       // When SLA expires
      breached: { type: Boolean, default: false },
      breachedAt: { type: Date },
      responseTime: { type: Number }, // Time taken to first response (ms)
      resolutionTime: { type: Number }, // Time taken to resolve (ms)
    },
    escalation: {
      currentLevel: {
        type: String,
        enum: ['initial', 'level1', 'level2', 'level3', 'mayor'],
        default: 'initial',
      },
      isOverdue: { type: Boolean, default: false },
      overdueAt: { type: Date },
      lastEscalatedAt: { type: Date },
      escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // System or user who escalated
      autoEscalated: { type: Boolean, default: false },
    },
    // Complete escalation history log for accountability
    escalationHistory: [
      {
        level: {
          type: String,
          enum: ['initial', 'level1', 'level2', 'level3', 'mayor'],
        },
        reason: { type: String },      // Why escalation happened
        escalatedAt: { type: Date, default: Date.now },
        escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isAuto: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],

    // ── Edit Window Tracking ─────────────────────────────────────────────
    editWindow: {
      expiresAt: { type: Date },       // When edit window expires
      lastEditedAt: { type: Date },
      editCount: { type: Number, default: 0 },
    },

    // ── Citizen Feedback & Rating ─────────────────────────────────────────
    feedback: {
      isRated: { type: Boolean, default: false },
      ratings: {
        resolutionQuality: { type: Number, min: 1, max: 5 },    // 1-5 stars
        responseTime: { type: Number, min: 1, max: 5 },         // 1-5 stars
        officerProfessionalism: { type: Number, min: 1, max: 5 }, // 1-5 stars
      },
      overallRating: { type: Number, min: 1, max: 5 },           // Calculated average
      comment: { type: String, maxlength: 500 },
      feedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      feedbackAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Index for geospatial queries
complaintSchema.index({ latitude: 1, longitude: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ voteCount: -1 });
// Indexes for SLA and escalation
complaintSchema.index({ 'sla.deadline': 1 });
complaintSchema.index({ 'sla.breached': 1 });
complaintSchema.index({ 'escalation.isOverdue': 1 });
complaintSchema.index({ 'escalation.currentLevel': 1 });
complaintSchema.index({ status: 1, priority: 1 });

// Method to calculate SLA deadline based on priority
complaintSchema.methods.calculateSLADeadline = function() {
  const slaHours = SLA_CONFIG[this.priority] || 168;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
};

// Method to check if complaint is overdue
complaintSchema.methods.checkOverdue = function() {
  if (this.status === 'resolved' || this.status === 'rejected') {
    return false;
  }
  const now = new Date();
  if (this.sla.deadline && now > this.sla.deadline) {
    return true;
  }
  return false;
};

// Method to escalate complaint
complaintSchema.methods.escalate = function(reason, escalatedBy, isAuto = false, notes = '') {
  const currentIndex = ESCALATION_LEVELS.indexOf(this.escalation.currentLevel);
  const nextLevel = ESCALATION_LEVELS[Math.min(currentIndex + 1, ESCALATION_LEVELS.length - 1)];
  
  this.escalation.currentLevel = nextLevel;
  this.escalation.lastEscalatedAt = new Date();
  this.escalation.escalatedBy = escalatedBy;
  this.escalation.autoEscalated = isAuto;
  
  // Add to history
  this.escalationHistory.push({
    level: nextLevel,
    reason: reason,
    escalatedAt: new Date(),
    escalatedBy: escalatedBy,
    isAuto: isAuto,
    notes: notes,
  });
  
  // Update priority based on escalation
  if (nextLevel === 'level1') {
    this.priority = 'High';
  } else if (nextLevel === 'level2') {
    this.priority = 'Critical';
  } else if (nextLevel === 'level3' || nextLevel === 'mayor') {
    this.emergencyFlag = true;
  }
  
  return this;
};

const Complaint = mongoose.model('Complaint', complaintSchema);

// Export both model and constants
Complaint.SLA_CONFIG = SLA_CONFIG;
Complaint.ESCALATION_LEVELS = ESCALATION_LEVELS;

module.exports = Complaint;
