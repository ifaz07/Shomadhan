const EmergencyBroadcast = require('../models/EmergencyBroadcast.model');
const User = require('../models/User.model');

// @desc    Create a new emergency broadcast
// @route   POST /api/v1/emergency-broadcast
// @access  Private (admin, department_officer)
const createBroadcast = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      severity,
      areaLabel,
      areaRadiusKm,
      affectedArea,
      targetAudience,
      scheduledAt,
      expiresAt,
      attachments,
    } = req.body;

    const normalizedAffectedArea =
      affectedArea?.coordinates?.length === 2
        ? affectedArea
        : undefined;

    const broadcast = await EmergencyBroadcast.create({
      title,
      message,
      type,
      severity,
      areaLabel,
      areaRadiusKm,
      affectedArea: normalizedAffectedArea,
      targetAudience: targetAudience || 'all',
      sentBy: req.user._id,
      scheduledAt,
      expiresAt,
      attachments,
      status: scheduledAt && new Date(scheduledAt) > new Date() ? 'draft' : 'active',
    });

    res.status(201).json({
      success: true,
      data: broadcast,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all emergency broadcasts
// @route   GET /api/v1/emergency-broadcast
// @access  Private
const getBroadcasts = async (req, res) => {
  try {
    const { status, type, severity, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (severity) query.severity = severity;

    const broadcasts = await EmergencyBroadcast.find(query)
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmergencyBroadcast.countDocuments(query);

    res.status(200).json({
      success: true,
      data: broadcasts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single emergency broadcast
// @route   GET /api/v1/emergency-broadcast/:id
// @access  Private
const getBroadcast = async (req, res) => {
  try {
    const broadcast = await EmergencyBroadcast.findById(req.params.id)
      .populate('sentBy', 'name email')
      .populate('deliveredTo.user', 'name email');

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found',
      });
    }

    res.status(200).json({
      success: true,
      data: broadcast,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update emergency broadcast
// @route   PUT /api/v1/emergency-broadcast/:id
// @access  Private (admin, department_officer)
const updateBroadcast = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      severity,
      areaLabel,
      areaRadiusKm,
      affectedArea,
      targetAudience,
      status,
      expiresAt,
      attachments,
    } = req.body;

    const broadcast = await EmergencyBroadcast.findById(req.params.id);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found',
      });
    }

    // Update fields
    if (title) broadcast.title = title;
    if (message) broadcast.message = message;
    if (type) broadcast.type = type;
    if (severity) broadcast.severity = severity;
    if (areaLabel !== undefined) broadcast.areaLabel = areaLabel;
    if (areaRadiusKm !== undefined) broadcast.areaRadiusKm = areaRadiusKm;
    if (affectedArea?.coordinates?.length === 2) broadcast.affectedArea = affectedArea;
    if (targetAudience) broadcast.targetAudience = targetAudience;
    if (status) broadcast.status = status;
    if (expiresAt) broadcast.expiresAt = expiresAt;
    if (attachments) broadcast.attachments = attachments;

    await broadcast.save();

    res.status(200).json({
      success: true,
      data: broadcast,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel emergency broadcast
// @route   PATCH /api/v1/emergency-broadcast/:id/cancel
// @access  Private (admin, department_officer)
const cancelBroadcast = async (req, res) => {
  try {
    const broadcast = await EmergencyBroadcast.findById(req.params.id);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found',
      });
    }

    if (broadcast.status === 'completed' || broadcast.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed or already cancelled broadcast',
      });
    }

    broadcast.status = 'cancelled';
    await broadcast.save();

    res.status(200).json({
      success: true,
      message: 'Broadcast cancelled successfully',
      data: broadcast,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get geo-targeted broadcasts for a location
// @route   GET /api/v1/emergency-broadcast/nearby
// @access  Public
const getGeoTargetedBroadcasts = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const broadcasts = await EmergencyBroadcast.find({
      status: 'active',
      expiresAt: { $gt: new Date() },
      $or: [
        { 'affectedArea.type': 'Point' },
        { 'affectedArea.type': 'Polygon' },
      ],
    }).populate('sentBy', 'name');

    // Filter broadcasts based on distance
    const nearbyBroadcasts = broadcasts.filter(broadcast => {
      if (!broadcast.affectedArea?.coordinates) return false;
      
      const [bLng, bLat] = broadcast.affectedArea.coordinates;
      const distance = calculateDistance(parseFloat(lat), parseFloat(lng), bLat, bLng);
      return distance <= (broadcast.affectedArea.radiusKm || parseFloat(radius));
    });

    res.status(200).json({
      success: true,
      data: nearbyBroadcasts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark broadcast as read
// @route   POST /api/v1/emergency-broadcast/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const broadcast = await EmergencyBroadcast.findById(req.params.id);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found',
      });
    }

    // Check if already marked as read
    const existingDelivery = broadcast.deliveredTo.find(
      d => d.user.toString() === req.user._id.toString()
    );

    if (existingDelivery) {
      existingDelivery.readAt = new Date();
    } else {
      broadcast.deliveredTo.push({
        user: req.user._id,
        deliveredAt: new Date(),
        readAt: new Date(),
      });
    }

    await broadcast.save();

    res.status(200).json({
      success: true,
      message: 'Broadcast marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get active emergencies
// @route   GET /api/v1/emergency-broadcast/active
// @access  Public
const getActiveEmergencies = async (req, res) => {
  try {
    const broadcasts = await EmergencyBroadcast.find({
      status: 'active',
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } },
      ],
    })
      .populate('sentBy', 'name')
      .sort({ severity: -1, createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: broadcasts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to calculate distance (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

module.exports = {
  createBroadcast,
  getBroadcasts,
  getBroadcast,
  updateBroadcast,
  cancelBroadcast,
  getGeoTargetedBroadcasts,
  markAsRead,
  getActiveEmergencies,
};
