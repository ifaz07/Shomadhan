const mongoose = require("mongoose");

const broadcastSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Broadcast title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Broadcast message is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Emergency type is required"],
      enum: ["fire", "flood", "road-collapse", "earthquake", "other"],
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    // Geo-targeting: area affected
    affectedArea: {
      type: {
        type: String,
        enum: ["Point", "Polygon"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude] for Point
      },
      radiusKm: {
        type: Number,
        default: 5, // Default radius in kilometers
      },
      address: {
        type: String,
      },
    },
    // Target audience
    targetAudience: {
      type: String,
      enum: ["all", "citizens", "servants", "admins"],
      default: "all",
    },
    // Status
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled"],
      default: "draft",
    },
    // Sender information
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Delivery tracking
    deliveredTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
        readAt: {
          type: Date,
        },
      },
    ],
    // Schedule for future broadcast
    scheduledAt: {
      type: Date,
    },
    // Expiration
    expiresAt: {
      type: Date,
    },
    // Media attachments (images, videos)
    attachments: [
      {
        url: String,
        type: {
          type: String,
          enum: ["image", "video"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for geo-queries
broadcastSchema.index({ "affectedArea": "2dsphere" });
broadcastSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("EmergencyBroadcast", broadcastSchema);