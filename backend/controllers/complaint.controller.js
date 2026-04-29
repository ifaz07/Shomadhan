const Complaint = require('../models/Complaint.model');
const User = require('../models/User.model');
const crypto = require('crypto');
const { classifyComplaint } = require('../services/nlpService');
const { checkForDuplicates, detectPrankComplaint } = require('../services/spamDetectionService');
const { calculatePriority } = require('../services/priorityService');
const { onComplaintSubmitted, onVotesReceived } = require('../services/reputationService');

// Helper: Generate unique ticket ID (e.g., SOM-2024-ABC12)
const generateTicketId = () => {
  const prefix = 'SOM';
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${random}`;
};

// Helper: Haversine distance in km between two lat/lng pairs
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// @desc    Submit a new complaint
// @route   POST /api/v1/complaints
// @access  Private
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, location, emergencyFlag } = req.body;
    let latitude = req.body.latitude;
    let longitude = req.body.longitude;
    const isAnonymous = req.body.isAnonymous === 'true' || req.body.isAnonymous === true;

    if (!title || !description) return res.status(400).json({ success: false, message: 'Title and description are required' });

    // ── Identity Verification Check ───────────────────────────────────────
    // Users must verify their identity using NID, Passport, or Birth Certificate
    // to create a complaint (non-anonymous posts)
    if (!isAnonymous) {
      const user = await User.findById(req.user._id);
      if (user) {
        const isVerified = user.isVerified === true || 
                         (user.verificationDoc && user.verificationDoc.status === 'approved');
        
        if (!isVerified) {
          return res.status(403).json({
            success: false,
            message: 'Identity verification required. Please verify your identity using NID, Passport, or Birth Certificate before posting complaints.',
            verificationRequired: true,
          });
        }
      }
    }

    latitude = latitude != null ? parseFloat(latitude) : null;
    longitude = longitude != null ? parseFloat(longitude) : null;

    // Run NLP classification (will fallback to rule-based if HF key missing)
    const nlp = await classifyComplaint(title, description);

    // Determine submitting user (anonymous complaints have no user)
    const userId = isAnonymous ? null : req.user?._id;

    // Spam / duplicate check
    let spamResult = { isSpam: false };
    try {
      spamResult = await checkForDuplicates(title, description, latitude, longitude, userId);
    } catch (err) {
      console.warn('[Complaint] Spam check failed:', err.message);
    }

    // AI-Based Prank/Fake Detection
    let prankResult = { isPrank: false, confidence: 0, reasons: [], modelVersion: '1.0.0' };
    try {
      prankResult = await detectPrankComplaint(title, description);
    } catch (err) {
      console.warn('[Complaint] Prank detection failed:', err.message);
    }

    // Priority calculation
    const priority = calculatePriority({
      category: category || nlp.category,
      emergencyFlag: emergencyFlag === 'true' || emergencyFlag === true,
      voteCount: 0,
      location: location || '',
    });

    // Calculate SLA deadline based on priority
    const slaHours = { Critical: 4, High: 24, Medium: 72, Low: 168 };
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + (slaHours[priority] || 168));

    // Calculate edit window (4 minutes)
    const editWindowExpires = new Date();
    editWindowExpires.setMinutes(editWindowExpires.getMinutes() + 4);

    // Prepare complaint document
    const complaint = new Complaint({
      ticketId: generateTicketId(),
      title,
      description,
      category: category || nlp.category,
      isAnonymous,
      user: userId,
      location,
      latitude,
      longitude,
      priority,
      emergencyFlag: emergencyFlag === 'true' || emergencyFlag === true,
      nlpAnalysis: {
        suggestedCategory: nlp.category,
        suggestedDepartment: nlp.department,
        keywords: nlp.keywords,
        confidence: nlp.confidence,
        source: nlp.source,
        analyzedAt: new Date(),
      },
      spamCheck: spamResult.isSpam
        ? {
            isDuplicate: true,
            originalTicketId: spamResult.originalTicketId,
            similarTo: spamResult.originalId,
            similarity: spamResult.similarity,
            method: spamResult.method,
            checkedAt: new Date(),
          }
        : { isDuplicate: false },
      // AI-Based Prank Detection
      prankDetection: {
        isPrank: prankResult.isPrank,
        confidence: prankResult.confidence,
        reasons: prankResult.reasons,
        modelVersion: prankResult.modelVersion,
        analyzedAt: new Date(),
      },
      // SLA Configuration
      sla: {
        deadline: slaDeadline,
        breached: false,
        responseTime: null,
        resolutionTime: null,
      },
      // Edit Window
      editWindow: {
        expiresAt: editWindowExpires,
        lastEditedAt: null,
        editCount: 0,
      },
    });

    // If evidence files were uploaded by `upload.middleware`, attach them
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      complaint.evidence = req.files.map((f) => ({ url: f.path || f.filename || f.location || f.secure_url, type: 'image', publicId: f.filename || f.public_id || '' }));
    }

    await complaint.save();

    // Update user reputation when they submit a complaint
    if (!isAnonymous && userId) {
      const user = await User.findById(userId);
      if (user) {
        await onComplaintSubmitted(user);
      }
    }

    // Return appropriate message based on prank detection
    if (prankResult.isPrank) {
      return res.status(201).json({
        success: true,
        data: complaint,
        warning: 'Your complaint has been flagged as potentially fake or prank. It will be reviewed by moderators.',
        prankDetection: prankResult,
      });
    }

    return res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote / un-vote a complaint (toggle)
// @route   POST /api/v1/complaints/:id/vote
// @access  Private
const voteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const userId = req.user._id.toString();
    const alreadyVoted = complaint.votes.some((v) => v.toString() === userId);
    let voteChange = 0;

    if (alreadyVoted) {
      // Remove vote
      complaint.votes = complaint.votes.filter((v) => v.toString() !== userId);
      voteChange = -1;
    } else {
      // Add vote
      complaint.votes.push(req.user._id);
      voteChange = 1;
    }

    complaint.voteCount = complaint.votes.length;

    // Recalculate priority after vote change
    complaint.priority = calculatePriority({
      category: complaint.category,
      emergencyFlag: complaint.emergencyFlag,
      voteCount: complaint.voteCount,
      location: complaint.location || '',
    });

    await complaint.save();

    // Update reputation of complaint owner when they receive votes
    if (voteChange > 0 && complaint.user) {
      const owner = await User.findById(complaint.user);
      if (owner) {
        await onVotesReceived(owner, voteChange);
      }
    }

    res.status(200).json({
      success: true,
      voted: !alreadyVoted,
      voteCount: complaint.voteCount,
      priority: complaint.priority,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get nearby complaints within a radius (for pre-submission duplicate check)
// @route   GET /api/v1/complaints/nearby?lat=&lng=&radius=&category=
// @access  Private
const getNearbyComplaints = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius) || 1; // default 1 km
    const category = req.query.category;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required' });
    }

    // Rough bounding box for initial DB filter (1 deg lat ≈ 111 km)
    const delta = radiusKm / 111;
    const query = {
      latitude: { $gte: lat - delta, $lte: lat + delta },
      longitude: { $gte: lng - delta, $lte: lng + delta },
      status: { $ne: 'rejected' },
    };
    if (category) query.category = category;

    const candidates = await Complaint.find(query)
      .select('ticketId title category status priority voteCount latitude longitude location createdAt')
      .sort('-voteCount -createdAt')
      .limit(20);

    // Filter to exact radius using Haversine
    const nearby = candidates.filter((c) => {
      if (c.latitude == null || c.longitude == null) return false;
      return haversineKm(lat, lng, c.latitude, c.longitude) <= radiusKm;
    });

    res.status(200).json({ success: true, count: nearby.length, data: nearby });
  } catch (error) {
    next(error);
  }
};

// @desc    Get heatmap data (all complaints with coordinates + priority weight)
// @route   GET /api/v1/complaints/heatmap
// @access  Private
const getHeatmapData = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
      status: { $ne: 'rejected' },
    }).select('latitude longitude priority voteCount category status ticketId title location createdAt emergencyFlag');

    // Weight map for heatmap intensity
    const WEIGHT = { Critical: 1.0, High: 0.7, Medium: 0.4, Low: 0.2 };

    const points = complaints.map((c) => ({
      lat: c.latitude,
      lng: c.longitude,
      weight: WEIGHT[c.priority] || 0.2,
      priority: c.priority,
      category: c.category,
      status: c.status,
      ticketId: c.ticketId,
      title: c.title,
      location: c.location,
      voteCount: c.voteCount,
      emergencyFlag: c.emergencyFlag,
      createdAt: c.createdAt,
    }));

    res.status(200).json({ success: true, count: points.length, data: points });
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
    
    // Check edit window (3-4 minutes based on requirement)
    const now = new Date();
    const createdAt = new Date(complaint.createdAt);
    const editWindowMs = 4 * 60 * 1000; // 4 minutes in milliseconds
    
    if (now - createdAt > editWindowMs) {
      return res.status(403).json({
        success: false,
        message: 'Edit window expired. Complaints can only be edited within 4 minutes of submission. After this, only delete is available.',
        canDelete: true,
      });
    }

    const { title, description, category, location, latitude, longitude, emergencyFlag } = req.body;
    const emergency = emergencyFlag === 'true' || emergencyFlag === true;

    const newPriority = calculatePriority({
      category: category || complaint.category,
      emergencyFlag: emergency,
      voteCount: complaint.voteCount,
      location: location || complaint.location || '',
    });

    // Update complaint with edit tracking
    complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        description, 
        category, 
        location, 
        latitude, 
        longitude, 
        emergencyFlag: emergency, 
        priority: newPriority,
        editWindow: {
          expiresAt: complaint.editWindow?.expiresAt || new Date(createdAt.getTime() + editWindowMs),
          lastEditedAt: now,
          editCount: (complaint.editWindow?.editCount || 0) + 1,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: complaint });
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
    res.status(200).json({ success: true, message: 'Complaint deleted successfully' });
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
    res.status(200).json({ success: true, count: complaints.length, data: complaints });
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
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze complaint text with NLP (without saving)
// @route   POST /api/v1/complaints/analyze
// @access  Private
const analyzeComplaint = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }
    const nlp = await classifyComplaint(title, description);
    return res.status(200).json({ success: true, data: nlp });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  analyzeComplaint,
  voteComplaint,
  getNearbyComplaints,
  getHeatmapData,
  getComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
};
