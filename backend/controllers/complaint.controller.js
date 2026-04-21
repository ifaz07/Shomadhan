const Complaint = require("../models/Complaint.model");
const crypto = require("crypto");
const { classifyComplaint } = require("../services/nlpService");
const { checkForDuplicates, analyzePrankPotential } = require("../services/spamDetectionService");
const { calculatePriority } = require("../services/priorityService");

// Helper: Generate unique ticket ID (e.g., SOM-2024-ABC12)
const generateTicketId = () => {
  const prefix = "SOM";
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
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
// @access  Private (Verified account required)
const createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      isAnonymous,
      location,
      latitude,
      longitude,
      emergencyFlag,
    } = req.body;

    // Check if user is verified
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Your account must be verified to submit a complaint. Please provide NID, Birth Certificate, or Passport in your profile.",
      });
    }

    let evidence = [];
    if (req.files && req.files.length > 0) {
      evidence = req.files.map((file) => {
        let type = "image";
        if (file.mimetype.startsWith("video/")) type = "video";
        if (file.mimetype.startsWith("audio/")) type = "audio";
        return { url: `/uploads/evidence/${file.filename}`, type };
      });
    }

    const isAnon = isAnonymous === "true" || isAnonymous === true;
    const emergency = emergencyFlag === "true" || emergencyFlag === true;
    const lat = latitude ? Number(latitude) : null;
    const lng = longitude ? Number(longitude) : null;

    // ── AI Prank Detection ───────────────────────────────────────────
    let aiStatus = { is_prank: false, confidence_score: 0 };
    try {
      aiStatus = await analyzePrankPotential(title, description);
    } catch (aiErr) {
      console.warn("[AI Prank Check] Skipped:", aiErr.message);
    }

    const finalStatus = (aiStatus.is_prank && aiStatus.confidence_score >= 0.80) 
      ? "rejected" 
      : "pending";

    // Auto-calculate initial priority (before votes, so voteCount = 0)
    const priority = calculatePriority({
      category,
      emergencyFlag: emergency,
      voteCount: 0,
      location: location || "",
    });

    const complaintData = {
      ticketId: generateTicketId(),
      title,
      description,
      category,
      evidence,
      isAnonymous: isAnon,
      location,
      latitude: lat,
      longitude: lng,
      user: isAnon ? null : req.user?._id,
      status: finalStatus,
      priority,
      emergencyFlag: emergency,
      voteCount: 0,
      votes: [],
      is_prank: aiStatus.is_prank,
      ai_confidence_score: aiStatus.confidence_score,
      current_authority_level: 1,
      last_escalated_at: new Date(),
    };

    if (finalStatus === "rejected") {
      complaintData.history = [{
        action: "AI Prank Detection",
        message: `System automatically rejected this complaint as a likely prank (Confidence: ${(aiStatus.confidence_score * 100).toFixed(1)}%)`,
        status: "rejected",
        date: new Date()
      }];
    }

    // ── Spam / duplicate detection ─────────────────────────────────────
    try {
      const spam = await checkForDuplicates(
        title,
        description,
        lat,
        lng,
        req.user._id,
      );
      if (spam.isSpam) {
        return res.status(409).json({
          success: false,
          message:
            "A similar complaint from the same area was already submitted within the last 24 hours. " +
            "Please check the existing ticket before submitting again.",
          duplicate: {
            ticketId: spam.originalTicketId,
            similarity: spam.similarity,
            method: spam.method,
          },
        });
      }
    } catch (spamErr) {
      console.warn("[SpamDetection] Check skipped:", spamErr.message);
    }

    // ── NLP classification ────────────────────────────────────────────
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
      console.warn("[NLP] Classification skipped:", nlpErr.message);
    }

    if (nlpAnalysis) complaintData.nlpAnalysis = nlpAnalysis;

    const complaint = await Complaint.create(complaintData);

    res.status(201).json({ success: true, data: complaint });
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
      return res
        .status(400)
        .json({
          success: false,
          message: "Both title and description are required for analysis",
        });
    }
    const result = await classifyComplaint(title, description);
    res.status(200).json({ success: true, data: result });
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
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const userId = req.user._id.toString();
    const alreadyVoted = complaint.votes.some((v) => v.toString() === userId);

    if (alreadyVoted) {
      // Remove vote
      complaint.votes = complaint.votes.filter((v) => v.toString() !== userId);
    } else {
      // Add vote
      complaint.votes.push(req.user._id);
    }

    complaint.voteCount = complaint.votes.length;

    // Recalculate priority after vote change
    complaint.priority = calculatePriority({
      category: complaint.category,
      emergencyFlag: complaint.emergencyFlag,
      voteCount: complaint.voteCount,
      location: complaint.location || "",
    });

    await complaint.save();

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

// @desc    Get heatmap data (all complaints with coordinates + priority weight)
// @route   GET /api/v1/complaints/heatmap
// @access  Public
const getHeatmapData = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
      status: { $ne: "rejected" },
    }).select(
      "latitude longitude priority voteCount category status ticketId title location createdAt emergencyFlag",
    );

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

// @desc    Get nearby complaints within a radius (for pre-submission duplicate check)
// @route   GET /api/v1/complaints/nearby?lat=&lng=&radius=&category=
// @access  Public
const getNearbyComplaints = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius) || 1; // default 1 km
    const category = req.query.category;

    if (isNaN(lat) || isNaN(lng)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "lat and lng query params are required",
        });
    }

    // Rough bounding box for initial DB filter (1 deg lat ≈ 111 km)
    const delta = radiusKm / 111;
    const query = {
      latitude: { $gte: lat - delta, $lte: lat + delta },
      longitude: { $gte: lng - delta, $lte: lng + delta },
      status: { $ne: "rejected" },
    };
    if (category) query.category = category;

    const candidates = await Complaint.find(query)
      .select(
        "ticketId title category status priority voteCount latitude longitude location createdAt",
      )
      .sort("-voteCount -createdAt")
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

// @desc    Edit a complaint (only within 4 minutes of creation)
// @route   PUT /api/v1/complaints/:id
// @access  Private
const updateComplaint = async (req, res, next) => {
  try {
    let complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }
    if (complaint.user?.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to edit this complaint",
        });
    }
    const timeDiff = Date.now() - new Date(complaint.createdAt).getTime();
    if (timeDiff > 4 * 60 * 1000) {
      return res.status(403).json({
        success: false,
        message:
          "Edit window expired. Complaints can only be edited within 4 minutes of submission.",
      });
    }

    const {
      title,
      description,
      category,
      location,
      latitude,
      longitude,
      emergencyFlag,
    } = req.body;
    const emergency = emergencyFlag === "true" || emergencyFlag === true;

    const newPriority = calculatePriority({
      category: category || complaint.category,
      emergencyFlag: emergency,
      voteCount: complaint.voteCount,
      location: location || complaint.location || "",
    });

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
      },
      { new: true, runValidators: true },
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
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }
    if (
      req.user.role !== "admin" &&
      complaint.user?.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to delete this complaint",
        });
    }
    await complaint.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Complaint deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get citywide aggregated stats (no PII — just counts by dept/status)
// @route   GET /api/v1/complaints/stats
// @access  Private
const getPublicStats = async (req, res, next) => {
  try {
    const all = await Complaint.find({ status: { $ne: "rejected" } }).select(
      "category priority status",
    );

    const CATEGORY_TO_DEPT = {
      Road: "public_works",
      Waste: "sanitation",
      Electricity: "electricity",
      Water: "water_authority",
      Safety: "public_safety",
      Environment: "public_works",
      Other: null,
    };

    const deptStats = {
      public_works: { total: 0, critical: 0, pending: 0 },
      water_authority: { total: 0, critical: 0, pending: 0 },
      electricity: { total: 0, critical: 0, pending: 0 },
      sanitation: { total: 0, critical: 0, pending: 0 },
      public_safety: { total: 0, critical: 0, pending: 0 },
      animal_control: { total: 0, critical: 0, pending: 0 },
    };

    let total = 0,
      critical = 0,
      inProgress = 0,
      resolved = 0;

    all.forEach((c) => {
      total++;
      if (c.priority === "Critical") critical++;
      if (c.status === "in-progress") inProgress++;
      if (c.status === "resolved") resolved++;

      const deptKey = CATEGORY_TO_DEPT[c.category];
      if (deptKey && deptStats[deptKey]) {
        deptStats[deptKey].total++;
        if (c.priority === "Critical") deptStats[deptKey].critical++;
        if (c.status === "pending" || c.status === "in-progress")
          deptStats[deptKey].pending++;
      }
    });

    res
      .status(200)
      .json({
        success: true,
        data: { total, critical, inProgress, resolved, departments: deptStats },
      });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints — all authenticated users see all public complaints
// @route   GET /api/v1/complaints?mine=true (optional: only the user's own)
// @access  Private
const getComplaints = async (req, res, next) => {
  try {
    let query = {};

    // Admins see everything; ?mine=true scopes to the requester's own complaints
    if (req.user.role !== "admin" && req.query.mine === "true") {
      query = { user: req.user._id };
    }

    // Optional server-side text filter on location field
    if (req.query.location) {
      query.location = { $regex: req.query.location, $options: "i" };
    }

    // Optional priority / status filters
    if (req.query.priority && req.query.priority !== "All") {
      query.priority = req.query.priority;
    }
    if (req.query.status && req.query.status !== "All") {
      query.status = req.query.status;
    }

    const complaints = await Complaint.find(query).sort("-createdAt");
    res
      .status(200)
      .json({ success: true, count: complaints.length, data: complaints });
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
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }
    // Any authenticated user can view any complaint (civic transparency)
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  analyzeComplaint,
  voteComplaint,
  getHeatmapData,
  getNearbyComplaints,
  getPublicStats,
  getComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
};
