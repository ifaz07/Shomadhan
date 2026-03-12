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
    type: String, // For cloud storage like Cloudinary if used later
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
      source: { type: String }, // 'huggingface' | 'rule-based'
      analyzedAt: { type: Date },
    },
    spamCheck: {
      isDuplicate: { type: Boolean, default: false },
      similarTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
      originalTicketId: { type: String },
      similarity: { type: Number },       // 0–1 similarity score
      method: { type: String },           // 'semantic' | 'keyword'
      checkedAt: { type: Date },
    },

    // ─── Priority & Voting ────────────────────────────────────────
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Low',
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    voteCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
