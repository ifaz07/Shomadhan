const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "video", "audio"],
    required: true,
  },
  publicId: {
    type: String,
  },
});

const complaintSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Road",
        "Waste",
        "Electricity",
        "Water",
        "Safety",
        "Environment",
        "Law Enforcement",
        "Other",
      ],
    },
    evidence: [evidenceSchema],
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.isAnonymous;
      },
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected"],
      default: "pending",
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
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },
    emergencyFlag: {
      type: Boolean,
      default: false,
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },

    // ── Public Voting ────────────────────────────────────────────────────
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    voteCount: { type: Number, default: 0 },

    // ── AI Detection ──
    is_prank: {
      type: Boolean,
      default: false,
    },
    ai_confidence_score: {
      type: Number,
      default: 0,
    },

    // ── Escalation System ──
    current_authority_level: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    last_escalated_at: {
      type: Date,
      default: Date.now,
    },

    history: [
      {
        action: String,
        from_level: Number,
        to_level: Number,
        status: String,
        message: String,
        date: {
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
      similarTo: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
      originalTicketId: { type: String },
      similarity: { type: Number },
      method: { type: String },
      checkedAt: { type: Date },
    },
    // ── SLA Tracking ─────────────────────────────────────────────
    slaDurationHours: {
      type: Number,
      default: 0,
    },
    slaDeadline: {
      type: Date,
    },
    slaAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// Index for geospatial queries
complaintSchema.index({ latitude: 1, longitude: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ voteCount: -1 });

module.exports = mongoose.model("Complaint", complaintSchema);
