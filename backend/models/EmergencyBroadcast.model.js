const mongoose = require("mongoose");

const affectedAreaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point", "Polygon"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude] for Point
      validate: {
        validator(value) {
          return value == null || value.length === 2;
        },
        message: "Coordinates must contain [longitude, latitude]",
      },
    },
    radiusKm: {
      type: Number,
      default: 5,
    },
    address: {
      type: String,
    },
  },
  { _id: false }
);

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
    areaLabel: {
      type: String,
      trim: true,
    },
    areaRadiusKm: {
      type: Number,
      default: 5,
      min: 1,
    },
    // Geo-targeting: area affected
    affectedArea: {
      type: affectedAreaSchema,
      default: undefined,
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
broadcastSchema.index(
  { affectedArea: "2dsphere" },
  {
    partialFilterExpression: {
      "affectedArea.coordinates.0": { $exists: true },
    },
  }
);
broadcastSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("EmergencyBroadcast", broadcastSchema);
