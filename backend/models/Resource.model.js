const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Resource name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Resource type is required"],
      enum: ["vehicle", "officer", "equipment", "crew", "other"],
    },
    category: {
      type: String,
      enum: ["fire", "flood-rescue", "medical", "transport", "construction", "utility", "other"],
    },
    // Current status
    status: {
      type: String,
      enum: ["available", "deployed", "maintenance", "out-of-service"],
      default: "available",
    },
    // Location
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
      address: String,
    },
    // Capacity information
    capacity: {
      maxPersons: {
        type: Number,
        default: 1,
      },
      maxWeightKg: {
        type: Number,
      },
    },
    // Assignment information
    assignedTo: {
      complaint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
      },
      assignedAt: {
        type: Date,
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    // Department
    department: {
      type: String,
      enum: ["fire", "police", "medical", "public-works", "transport", "utility", "other"],
    },
    // Contact information
    contact: {
      phone: String,
      radioChannel: String,
    },
    // Capabilities/Skills
    capabilities: [
      {
        type: String,
      },
    ],
    // Availability schedule
    availability: [
      {
        dayOfWeek: {
          type: Number, // 0-6 (Sunday-Saturday)
        },
        startTime: String, // "HH:mm"
        endTime: String,
      },
    ],
    // Last maintenance
    lastMaintenance: {
      type: Date,
    },
    nextMaintenance: {
      type: Date,
    },
    // Notes
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Index for geo-queries and status
resourceSchema.index({ currentLocation: "2dsphere" });
resourceSchema.index({ status: 1, type: 1 });
resourceSchema.index({ department: 1, status: 1 });

module.exports = mongoose.model("Resource", resourceSchema);