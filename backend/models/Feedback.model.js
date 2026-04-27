const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.isAnonymous;
      },
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    userName: {
      type: String,
      // For display when anonymous
    },
    // Ratings (1-5 scale)
    resolutionQuality: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    responseTime: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    officerProfessionalism: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Optional feedback text
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    // Average rating for quick display
    averageRating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Ensure one feedback per complaint per user
feedbackSchema.index({ complaint: 1, user: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
