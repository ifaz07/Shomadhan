const mongoose = require("mongoose");

const emergencyBroadcastSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["mayor", "department_officer"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    disasterType: {
      type: String,
      enum: [
        "fire",
        "flood",
        "cyclone",
        "storm_surge",
        "riverbank_erosion",
        "landslide",
        "earthquake",
        "road_collapse",
        "building_collapse",
        "gas_explosion",
        "industrial_accident",
        "heatwave",
        "drought",
        "water_logging",
        "epidemic",
        "electrical_hazard",
        "other",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    areaLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    radiusKm: {
      type: Number,
      required: true,
      min: 0.1,
      max: 100,
    },
    recipientsCount: {
      type: Number,
      default: 0,
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EmergencyBroadcast", emergencyBroadcastSchema);
