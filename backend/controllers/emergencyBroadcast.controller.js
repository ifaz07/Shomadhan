const EmergencyBroadcast = require("../models/EmergencyBroadcast.model");
const User = require("../models/User.model");
const { sendNotification, haversineKm } = require("../services/notificationService");

const DISASTER_LABELS = {
  fire: "Fire",
  flood: "Flood",
  cyclone: "Cyclone",
  storm_surge: "Storm Surge",
  riverbank_erosion: "Riverbank Erosion",
  landslide: "Landslide",
  earthquake: "Earthquake",
  road_collapse: "Road Collapse",
  building_collapse: "Building Collapse",
  gas_explosion: "Gas Explosion",
  industrial_accident: "Industrial Accident",
  heatwave: "Heatwave",
  drought: "Drought",
  water_logging: "Water Logging",
  epidemic: "Epidemic",
  electrical_hazard: "Electrical Hazard",
  other: "Emergency",
};

const AUDIENCE_ROLE_LABELS = {
  citizen: "Citizen",
  mayor: "Mayor",
  department_officer: "Public Servant",
};

const ALLOWED_TARGET_ROLES = {
  mayor: ["citizen", "department_officer"],
  department_officer: ["citizen", "mayor"],
};

const parseTargetRoles = (senderRole, requestedAudience) => {
  const allowedRoles = ALLOWED_TARGET_ROLES[senderRole] || [];
  const normalized = String(requestedAudience || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const uniqueRequested = [...new Set(normalized)];
  const requestedValidRoles = uniqueRequested.filter((role) =>
    allowedRoles.includes(role),
  );

  if (requestedValidRoles.length > 0) {
    return requestedValidRoles;
  }

  return allowedRoles;
};

const createEmergencyBroadcast = async (req, res, next) => {
  try {
    const { title, disasterType, message, areaLabel, lat, lng, radiusKm, targetRoles } = req.body;

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const parsedRadius = Number(radiusKm);

    if (!title || !disasterType || !message || !areaLabel) {
      return res.status(400).json({
        success: false,
        message: "Title, disaster type, area, and message are required.",
      });
    }

    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return res.status(400).json({
        success: false,
        message: "A valid emergency location must be selected.",
      });
    }

    if (!Number.isFinite(parsedRadius) || parsedRadius < 0.1 || parsedRadius > 100) {
      return res.status(400).json({
        success: false,
        message: "Radius must be between 0.1 km and 100 km.",
      });
    }

    const resolvedTargetRoles = parseTargetRoles(req.user.role, targetRoles);
    if (resolvedTargetRoles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one valid recipient group for this emergency broadcast.",
      });
    }

    const targetUsers = await User.find({
      role: { $in: resolvedTargetRoles },
      "presentAddress.lat": { $ne: null },
      "presentAddress.lng": { $ne: null },
    }).select("_id name email fcmToken presentAddress role");

    const recipients = targetUsers.filter((user) => {
      const distance = haversineKm(
        parsedLat,
        parsedLng,
        user.presentAddress.lat,
        user.presentAddress.lng
      );

      return distance <= parsedRadius;
    });

    const broadcast = await EmergencyBroadcast.create({
      sender: req.user._id,
      senderRole: req.user.role,
      title: String(title).trim(),
      disasterType,
      message: String(message).trim(),
      areaLabel: String(areaLabel).trim(),
      location: {
        lat: parsedLat,
        lng: parsedLng,
      },
      radiusKm: parsedRadius,
      targetRoles: resolvedTargetRoles,
      recipientsCount: recipients.length,
      recipients: recipients.map((recipient) => recipient._id),
      audioUrl: req.file ? `/uploads/evidence/${req.file.filename}` : null,
    });

    const disasterLabel = DISASTER_LABELS[disasterType] || DISASTER_LABELS.other;
    const senderLabel =
      req.user.role === "mayor"
        ? "Mayor's Office"
        : `${req.user.designation || "Public Servant"} Office`;
    const audienceLabel = resolvedTargetRoles
      .map((role) => AUDIENCE_ROLE_LABELS[role] || role)
      .join(", ");

    await Promise.all(
      recipients.map((recipient) =>
        sendNotification(recipient._id, {
          subject: `Emergency Alert: ${disasterLabel} near ${broadcast.areaLabel}`,
          message: `${broadcast.title}. ${broadcast.message} Affected area: ${broadcast.areaLabel} within ${broadcast.radiusKm} km. Sent by ${senderLabel}.`,
          type: "warning",
        })
      )
    );

    const populatedBroadcast = await EmergencyBroadcast.findById(broadcast._id).populate(
      "sender",
      "name role designation department"
    );

    res.status(201).json({
      success: true,
      message:
        recipients.length > 0
          ? `Emergency broadcast sent to ${recipients.length} ${audienceLabel.toLowerCase()} recipient${recipients.length === 1 ? "" : "s"}.`
          : `Emergency broadcast created, but no ${audienceLabel.toLowerCase()} recipients were found inside the selected radius.`,
      data: populatedBroadcast,
    });
  } catch (error) {
    next(error);
  }
};

const getEmergencyBroadcasts = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === "citizen") {
      query = { recipients: req.user._id };
    } else if (req.user.role === "mayor" || req.user.role === "department_officer") {
      query = { sender: req.user._id };
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view emergency broadcast history.",
      });
    }

    const broadcasts = await EmergencyBroadcast.find(query)
      .populate("sender", "name role designation department")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: broadcasts.length,
      data: broadcasts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmergencyBroadcast,
  getEmergencyBroadcasts,
};
