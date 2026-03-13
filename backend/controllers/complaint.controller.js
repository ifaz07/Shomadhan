const Complaint = require('../models/Complaint.model');
const crypto = require('crypto');
const { classifyComplaint } = require('../services/nlpService');
const { checkForDuplicates } = require('../services/spamDetectionService');

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
    const { title, description, category, isAnonymous, location, latitude, longitude } = req.body;
    
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
      location,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      user: (isAnonymous === 'true' || isAnonymous === true) ? null : req.user?._id,
      status: 'pending', // Explicitly set initial status
    };

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

// @desc    Edit a complaint (only within 4 minutes of creation)
// @route   PUT /api/v1/complaints/:id
// @access  Private
const updateComplaint = async (req, res, next) => {
  try {
    let complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Authorization check
    if (complaint.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this complaint' });
    }

    // 4-minute window check (4 * 60 * 1000 ms)
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

    // Authorization check (owner or admin)
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

    // Authorization check
    if (req.user.role !== 'admin' && complaint.user?.toString() !== req.user._id.toString()) {
       if (complaint.isAnonymous) {
         return res.status(403).json({ success: false, message: 'Not authorized to view this' });
       }
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
};
