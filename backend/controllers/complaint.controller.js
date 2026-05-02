const Complaint = require("../models/Complaint.model");
const User = require("../models/User.model");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { classifyComplaint } = require("../services/nlpService");
const {
  checkForDuplicates,
  analyzePrankPotential,
} = require("../services/spamDetectionService");
const { calculatePriority } = require("../services/priorityService");
const {
  sendNotification,
  sendEmergencyAlertToNearbyUsers,
} = require("../services/notificationService");
const Feedback = require("../models/Feedback.model");
const {
  DEPARTMENT_KEYS,
  getDepartmentComplaintValues,
  normalizeDepartmentKey,
} = require("../utils/departmentTaxonomy");

const getCurrentAwardPeriod = (date = new Date()) => ({
  awardMonth: date.getMonth() + 1,
  awardYear: date.getFullYear(),
});

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

    const finalStatus =
      aiStatus.is_prank && aiStatus.confidence_score >= 0.8
        ? "rejected"
        : "pending";

    const normalizedCategory = normalizeDepartmentKey(category);
    if (!normalizedCategory) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid department for this complaint.",
      });
    }

    // Auto-calculate initial priority (before votes, so voteCount = 0)
    const priority = calculatePriority({
      category: normalizedCategory,
      emergencyFlag: emergency,
      voteCount: 0,
      location: location || "",
    });

    const complaintData = {
      ticketId: generateTicketId(),
      title,
      description,
      category: normalizedCategory,
      evidence,
      isAnonymous: isAnon,
      location,
      latitude: lat,
      longitude: lng,
      // Keep the private owner link even for anonymous complaints so the
      // citizen can still track and rate their own case after closure.
      user: req.user?._id,
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
      complaintData.history = [
        {
          action: "AI Prank Detection",
          message: `System automatically rejected this complaint as a likely prank (Confidence: ${(aiStatus.confidence_score * 100).toFixed(1)}%)`,
          status: "rejected",
          date: new Date(),
        },
      ];
    }

    // ── Spam / duplicate detection ─────────────────────────────────────
    try {
      const spam = await checkForDuplicates(
        title,
        description,
        lat,
        lng,
        location,
        req.user._id,
        normalizedCategory,
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

    // Trigger Notification
    if (complaint.user) {
      await sendNotification(complaint.user, {
        subject: "Complaint Received: " + complaint.ticketId,
        message: `Your complaint "${complaint.title}" has been received and is currently pending review. Ticket ID: ${complaint.ticketId}`,
        type: "info",
        relatedTicket: complaint._id,
      });
    }

    // ─── Emergency Broadcast ───────────────────────────────────────
    if (complaint.emergencyFlag) {
      // Async broadcast to nearby users
      sendEmergencyAlertToNearbyUsers(complaint);
    }

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
      return res.status(400).json({
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

    if (complaint.status === "resolved" || complaint.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Closed complaints can no longer receive public support",
      });
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
      status: { $nin: ["resolved", "rejected"] },
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
    const priority = req.query.priority;
    const status = req.query.status;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "lat and lng query params are required",
      });
    }

    // Rough bounding box for initial DB filter (1 deg lat ≈ 111 km)
    const delta = radiusKm / 111;
    const query = {
      latitude: { $gte: lat - delta, $lte: lat + delta },
      longitude: { $gte: lng - delta, $lte: lng + delta },
      status: { $nin: ["resolved", "rejected"] },
    };
    if (category) {
      const normalizedCategory = normalizeDepartmentKey(category);
      if (normalizedCategory) {
        query.category = {
          $in: getDepartmentComplaintValues(normalizedCategory),
        };
      } else {
        query.category = category;
      }
    }
    if (priority && priority !== "All") {
      query.priority = priority;
    }
    if (status && status !== "All") {
      query.status = status;
    }

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
      return res.status(403).json({
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
    const normalizedCategory = normalizeDepartmentKey(category);

    const newPriority = calculatePriority({
      category: normalizedCategory || complaint.category,
      emergencyFlag: emergency,
      voteCount: complaint.voteCount,
      location: location || complaint.location || "",
    });

    complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        category: normalizedCategory || complaint.category,
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
      return res.status(403).json({
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
    const { filter } = req.query; // 'monthly' or 'yearly'
    let dateFilter = { status: { $ne: "rejected" } };

    if (filter === "monthly") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      dateFilter.createdAt = { $gte: startOfMonth };
    } else if (filter === "yearly") {
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      dateFilter.createdAt = { $gte: startOfYear };
    }

    const all = await Complaint.find(dateFilter).select(
      "category priority status",
    );

    // Fetch the current Good Citizen of the month
    const currentAwardPeriod = getCurrentAwardPeriod();
    const goodCitizen = await User.findOne({
      role: "citizen",
      badges: {
        $elemMatch: {
          type: "good_citizen_monthly",
          awardMonth: currentAwardPeriod.awardMonth,
          awardYear: currentAwardPeriod.awardYear,
        },
      },
    }).select("name avatar points badges");

    const deptStats = DEPARTMENT_KEYS.reduce((acc, key) => {
      acc[key] = {
        total: 0,
        critical: 0,
        pending: 0,
        resolved: 0,
        inProgress: 0,
      };
      return acc;
    }, {});

    let total = 0,
      critical = 0,
      high = 0,
      medium = 0,
      low = 0,
      inProgress = 0,
      resolved = 0;

    all.forEach((c) => {
      total++;
      if (c.priority === "Critical") critical++;
      if (c.priority === "High") high++;
      if (c.priority === "Medium") medium++;
      if (c.priority === "Low") low++;
      if (c.status === "in-progress") inProgress++;
      if (c.status === "resolved") resolved++;

      const deptKey = normalizeDepartmentKey(c.category);
      if (deptKey && deptStats[deptKey]) {
        deptStats[deptKey].total++;
        if (c.priority === "Critical") deptStats[deptKey].critical++;
        if (c.status === "pending") deptStats[deptKey].pending++;
        if (c.status === "in-progress") {
          deptStats[deptKey].pending++;
          deptStats[deptKey].inProgress++;
        }
        if (c.status === "resolved") deptStats[deptKey].resolved++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        critical,
        high,
        medium,
        low,
        inProgress,
        resolved,
        departments: deptStats,
        goodCitizen,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Maps priority and status to a numeric value for "always on top" sorting
const PRIORITY_SORT_STAGE = {
  $addFields: {
    _sortWeight: {
      $switch: {
        branches: [
          // Closed complaints always go to the bottom of mixed lists
          { case: { $eq: ["$status", "rejected"] }, then: -2 },
          { case: { $eq: ["$status", "resolved"] }, then: -1 },
          // Critical + Pending gets the absolute highest weight (always on top)
          {
            case: {
              $and: [
                { $eq: ["$priority", "Critical"] },
                { $eq: ["$status", "pending"] },
              ],
            },
            then: 100,
          },
          // Other Critical cases
          { case: { $eq: ["$priority", "Critical"] }, then: 90 },
          // Regular priority levels
          { case: { $eq: ["$priority", "High"] }, then: 3 },
          { case: { $eq: ["$priority", "Medium"] }, then: 2 },
          { case: { $eq: ["$priority", "Low"] }, then: 1 },
        ],
        default: 0,
      },
    },
  },
};

// @desc    Get all complaints — all authenticated users see all public complaints
// @route   GET /api/v1/complaints?mine=true (optional: only the user's own)
// @access  Private
const getComplaints = async (req, res, next) => {
  try {
    let query = {};
    const isExecutive = ["admin", "mayor"].includes(req.user.role);
    const mineOnly = !isExecutive && req.query.mine === "true";

    // Executive roles see everything; others see their own if mine=true
    if (mineOnly) {
      query = { user: req.user._id };
    }

    const { filter } = req.query;
    if (filter === "monthly") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfMonth };
    } else if (filter === "yearly") {
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: startOfYear };
    }

    // Optional server-side text filter on location field
    if (req.query.location) {
      query.location = { $regex: req.query.location, $options: "i" };
    }

    // Keep the public dashboard stats and list aligned by default.
    if (req.query.excludeRejected === "true") {
      query.status = { $ne: "rejected" };
    }

    // Optional priority / status filters
    if (req.query.priority && req.query.priority !== "All") {
      query.priority = req.query.priority;
    }
    if (req.query.status && req.query.status !== "All") {
      query.status = req.query.status;
    }

    const complaints = await Complaint.aggregate([
      { $match: query },
      PRIORITY_SORT_STAGE,
      { $sort: { _sortWeight: -1, createdAt: -1 } },
    ]);

    if (mineOnly && complaints.length > 0) {
      const complaintIds = complaints.map((complaint) => complaint._id);
      const feedbacks = await Feedback.find({
        complaint: { $in: complaintIds },
        user: req.user._id,
      }).select("complaint createdAt averageRating isAnonymous");

      const feedbackMap = new Map(
        feedbacks.map((feedback) => [feedback.complaint.toString(), feedback]),
      );

      complaints.forEach((complaint) => {
        const submittedFeedback = feedbackMap.get(complaint._id.toString());
        complaint.feedbackSubmitted = Boolean(submittedFeedback);
        complaint.feedbackSubmittedAt = submittedFeedback?.createdAt || null;
        complaint.myAverageRating = submittedFeedback?.averageRating || null;
        complaint.myFeedbackIsAnonymous =
          submittedFeedback?.isAnonymous ?? null;
      });
    }

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
    const complaint = await Complaint.findById(req.params.id)
      .populate("user", "name isVerified avatar role")
      .lean();
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const ownerId =
      typeof complaint.user === "object" && complaint.user !== null
        ? complaint.user._id
        : complaint.user;
    const isOwner = ownerId && ownerId.toString() === req.user._id.toString();

    if (isOwner) {
      const myFeedback = await Feedback.findOne({
        complaint: complaint._id,
        user: req.user._id,
      }).select(
        "resolutionQuality responseTime officerProfessionalism averageRating createdAt",
      );

      complaint.feedbackSubmitted = Boolean(myFeedback);
      complaint.feedbackSubmittedAt = myFeedback?.createdAt || null;
      complaint.myFeedback = myFeedback || null;
    } else {
      complaint.feedbackSubmitted = false;
      complaint.feedbackSubmittedAt = null;
      complaint.myFeedback = null;
    }

    complaint.submittedBy = complaint.isAnonymous
      ? null
      : complaint.user
        ? {
            name: complaint.user.name,
            isVerified: complaint.user.isVerified,
            avatar: complaint.user.avatar || "",
            role: complaint.user.role || "",
          }
        : null;

    // Any authenticated user can view any complaint (civic transparency)
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

// ─── POST /complaints/:complaintId/feedback ──────────────────────
const submitFeedback = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const {
      resolutionQuality,
      responseTime,
      officerProfessionalism,
      comment,
      isAnonymous,
    } = req.body;

    // Validate complaint exists and is resolved
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }
    if (complaint.status !== "resolved") {
      return res
        .status(400)
        .json({ success: false, message: "Can only rate resolved complaints" });
    }

    if (!complaint.user || complaint.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the citizen who submitted this complaint can rate it",
      });
    }

    const existing = await Feedback.findOne({
      complaint: complaintId,
      user: req.user.id,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this complaint",
      });
    }

    // Validate ratings
    [resolutionQuality, responseTime, officerProfessionalism].forEach(
      (rating) => {
        if (!rating || rating < 1 || rating > 5) {
          throw new Error("Ratings must be between 1 and 5");
        }
      },
    );

    // Create feedback
    const averageRating =
      Math.round(
        ((resolutionQuality + responseTime + officerProfessionalism) / 3) * 10,
      ) / 10;

    const feedbackData = {
      complaint: complaintId,
      resolutionQuality,
      responseTime,
      officerProfessionalism,
      comment: comment?.trim() || "",
      isAnonymous,
      averageRating,
    };

    feedbackData.user = req.user.id;
    if (!isAnonymous) {
      feedbackData.userName = req.user.name;
    } else {
      feedbackData.userName = "Anonymous Citizen";
    }

    const feedback = await Feedback.create(feedbackData);

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's feedback status for a complaint
// @route   GET /api/v1/complaints/:complaintId/feedback/me
// @access  Private
const getMyFeedbackForComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId).select(
      "status user ticketId",
    );
    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const isOwner =
      complaint.user && complaint.user.toString() === req.user._id.toString();
    const feedback = isOwner
      ? await Feedback.findOne({
          complaint: complaintId,
          user: req.user._id,
        }).select(
          "resolutionQuality responseTime officerProfessionalism averageRating comment isAnonymous createdAt",
        )
      : null;

    res.status(200).json({
      success: true,
      data: {
        complaintId,
        complaintStatus: complaint.status,
        isOwner,
        canSubmit: isOwner && complaint.status === "resolved" && !feedback,
        hasSubmitted: Boolean(feedback),
        feedback,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /complaints/:complaintId/feedback ──────────────────────
const getFeedbackForComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const feedbacks = await Feedback.find({ complaint: complaintId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /complaints/:complaintId/feedback/stats ──────────────────
const getFeedbackStats = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const stats = await Feedback.aggregate([
      { $match: { complaint: mongoose.Types.ObjectId(complaintId) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgResolutionQuality: { $avg: "$resolutionQuality" },
          avgResponseTime: { $avg: "$responseTime" },
          avgOfficerProfessionalism: { $avg: "$officerProfessionalism" },
          overallRating: { $avg: "$averageRating" },
        },
      },
    ]);

    const result = stats[0] || {
      count: 0,
      avgResolutionQuality: 0,
      avgResponseTime: 0,
      avgOfficerProfessionalism: 0,
      overallRating: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all citizen feedback entries
// @route   GET /api/v1/complaints/feedback/all
// @access  Private
const getAllFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("complaint", "ticketId title category status location")
      .sort({ createdAt: -1 })
      .lean();

    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageRating: { $avg: "$averageRating" },
          averageResolutionQuality: { $avg: "$resolutionQuality" },
          averageResponseTime: { $avg: "$responseTime" },
          averageOfficerProfessionalism: { $avg: "$officerProfessionalism" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      stats: stats[0] || {
        total: 0,
        averageRating: 0,
        averageResolutionQuality: 0,
        averageResponseTime: 0,
        averageOfficerProfessionalism: 0,
      },
      data: feedbacks,
    });
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
  submitFeedback,
  getMyFeedbackForComplaint,
  getFeedbackForComplaint,
  getFeedbackStats,
  getAllFeedback,
};
