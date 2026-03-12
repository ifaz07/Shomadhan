const Complaint = require('../models/Complaint.model');
const crypto = require('crypto');
const { classifyComplaint } = require('../services/nlpService');
const { checkForDuplicates, haversineDistance } = require('../services/spamDetectionService');
const { calculatePriority } = require('../services/priorityService');

// Helper: Generate unique ticket ID (e.g., SOM-2024-ABC12)
const generateTicketId = () => {
  const prefix = 'SOM';
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${random}`;
};

// @desc    Submit a new complaint
// @route   POST /api/v1/complaints
// @access  Private (Verified account required)
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, isAnonymous, location, latitude, longitude, isEmergency } = req.body;

    // Check if user is verified
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your account must be verified to submit a complaint. Please provide NID, Birth Certificate, or Passport in your profile.',
      });
    }

    let evidence = [];
    if (req.files && req.files.length > 0) {
      evidence = req.files.map((file) => {
        let type = 'image';
        if (file.mimetype.startsWith('video/')) type = 'video';
        if (file.mimetype.startsWith('audio/')) type = 'audio';

        return {
          url: `/uploads/evidence/${file.filename}`,
          type,
        };
      });
    }

    const complaintData = {
      ticketId: generateTicketId(),
      title,
      description,
      category,
      evidence,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      isEmergency: isEmergency === 'true' || isEmergency === true,
      location,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      user: (isAnonymous === 'true' || isAnonymous === true) ? null : req.user?._id,
      status: 'pending',
    };

    // ── Auto-calculate priority ────────────────────────────────────────────
    complaintData.priority = calculatePriority(complaintData);

    // ── Spam / duplicate detection ─────────────────────────────────────────
    try {
      const spam = await checkForDuplicates(
        title,
        description,
        complaintData.latitude,
        complaintData.longitude,
        complaintData.user  // null for anonymous → spam check skipped
      );

      if (spam.isSpam) {
        return res.status(409).json({
          success: false,
          message:
            'A similar complaint from the same area was already submitted within the last 24 hours. ' +
            'Please check the existing ticket before submitting again.',
          duplicate: {
            ticketId: spam.originalTicketId,
            similarity: spam.similarity,
            method: spam.method,
          },
        });
      }
    } catch (spamErr) {
      console.warn('[SpamDetection] Check skipped:', spamErr.message);
    }

    // ── NLP classification ────────────────────────────────────────────────
    let nlpAnalysis = null;
    try {
      const nlp = await classifyComplaint(title, description);
      nlpAnalysis = {
        suggestedCategory: nlp.category,
        suggestedDepartment: nlp.department,
        keywords: nlp.keywords,
        confidence: nlp.confidence,
        source: nlp.source,
        analyzedAt: new Date(),
      };
    } catch (nlpErr) {
      console.warn('[NLP] Classification skipped:', nlpErr.message);
    }

    if (nlpAnalysis) {
      complaintData.nlpAnalysis = nlpAnalysis;
    }

    const complaint = await Complaint.create(complaintData);

    res.status(201).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze complaint text with NLP (preview before submission)
// @route   POST /api/v1/complaints/analyze
// @access  Private
const analyzeComplaint = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Both title and description are required for analysis',
      });
    }

    const result = await classifyComplaint(title, description);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get heatmap data (lat/lng + intensity) for all complaints with coordinates
// @route   GET /api/v1/complaints/heatmap
// @access  Public
const getHeatmapData = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const complaints = await Complaint.find({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
      createdAt: { $gte: since },
    }).select('latitude longitude priority');

    const priorityIntensity = { Critical: 1.0, High: 0.7, Medium: 0.4, Low: 0.2 };

    const points = complaints.map((c) => [
      c.latitude,
      c.longitude,
      priorityIntensity[c.priority] || 0.2,
    ]);

    res.status(200).json({
      success: true,
      count: points.length,
      data: points,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complaints near a coordinate (for pre-submission awareness)
// @route   GET /api/v1/complaints/nearby?lat=&lng=&radius=
// @access  Public
const getNearbyComplaints = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius) || 1.0;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const complaints = await Complaint.find({
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null },
      status: { $ne: 'rejected' },
      createdAt: { $gte: since },
    }).select('ticketId title category status priority voteCount latitude longitude createdAt');

    // CPU-side Haversine filter
    const nearby = complaints
      .map((c) => ({
        ...c.toObject(),
        distance: haversineDistance(lat, lng, c.latitude, c.longitude),
      }))
      .filter((c) => c.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      count: nearby.length,
      data: nearby,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote (or un-vote) a complaint
// @route   POST /api/v1/complaints/:id/vote
// @access  Private
const upvoteComplaint = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // Check if already voted
    const existing = await Complaint.findOne({ _id: id, votes: userId });

    let updated;
    let voted;

    if (!existing) {
      // Add vote
      updated = await Complaint.findByIdAndUpdate(
        id,
        { $addToSet: { votes: userId }, $inc: { voteCount: 1 } },
        { new: true }
      );
      voted = true;
    } else {
      // Remove vote
      updated = await Complaint.findByIdAndUpdate(
        id,
        { $pull: { votes: userId }, $inc: { voteCount: -1 } },
        { new: true }
      );
      // Clamp voteCount to 0
      if (updated.voteCount < 0) {
        updated = await Complaint.findByIdAndUpdate(id, { voteCount: 0 }, { new: true });
      }
      voted = false;
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Recalculate priority after vote change
    const newPriority = calculatePriority(updated);
    if (newPriority !== updated.priority) {
      updated = await Complaint.findByIdAndUpdate(
        id,
        { priority: newPriority },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      voted,
      voteCount: updated.voteCount,
      priority: updated.priority,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a complaint (only within 4 minutes of creation)
// @route   PUT /api/v1/complaints/:id
// @access  Private
const updateComplaint = async (req, res, next) => {
  try {
    let complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (complaint.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this complaint' });
    }

    const timeDiff = Date.now() - new Date(complaint.createdAt).getTime();
    if (timeDiff > 4 * 60 * 1000) {
      return res.status(403).json({
        success: false,
        message: 'Edit window expired. Complaints can only be edited within 4 minutes of submission.',
      });
    }

    const { title, description, category, location, latitude, longitude } = req.body;

    complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { title, description, category, location, latitude, longitude },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a complaint
// @route   DELETE /api/v1/complaints/:id
// @access  Private
const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (req.user.role !== 'admin' && complaint.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this complaint' });
    }

    await complaint.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints (admin or for users who submitted them)
// @route   GET /api/v1/complaints
// @access  Private
const getComplaints = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role !== 'admin') {
      query = { user: req.user._id };
    }

    const complaints = await Complaint.find(query).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single complaint
// @route   GET /api/v1/complaints/:id
// @access  Private
const getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (req.user.role !== 'admin' && complaint.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this' });
    }

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  analyzeComplaint,
  getComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
  getHeatmapData,
  getNearbyComplaints,
  upvoteComplaint,
};
