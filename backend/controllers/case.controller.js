const CaseProgress = require('../models/CaseProgress.model');
const Complaint = require('../models/Complaint.model');
const crypto = require('crypto');

// Helper: Generate unique case number (e.g., CASE-2024-ABC123)
const generateCaseNumber = () => {
  const prefix = 'CASE';
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${random}`;
};

// @desc    Register a police case from complaint
// @route   POST /api/v1/cases
// @access  Private (Public Safety Officer only)
const registerCase = async (req, res, next) => {
  try {
    const { complaintId, caseType, severity } = req.body;

    if (!complaintId || !caseType) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID and case type are required',
      });
    }

    // Check if complaint exists
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Check if case already exists for this complaint
    const existingCase = await CaseProgress.findOne({ complaint: complaintId });
    if (existingCase) {
      return res.status(400).json({
        success: false,
        message: 'A case already exists for this complaint',
      });
    }

    const caseProgress = new CaseProgress({
      complaint: complaintId,
      caseNumber: generateCaseNumber(),
      assignedOfficer: req.user._id,
      caseType,
      severity: severity || 'moderate',
      investigationStatus: 'registered',
      registeredAt: new Date(),
    });

    await caseProgress.save();

    res.status(201).json({
      success: true,
      message: 'Case registered successfully',
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get case progress
// @route   GET /api/v1/cases/:caseId
// @access  Private
const getCaseProgress = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const caseProgress = await CaseProgress.findById(caseId)
      .populate('complaint', 'title description category priority status')
      .populate('assignedOfficer', 'name email department')
      .populate('updates.updatedBy', 'name email');

    if (!caseProgress) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    res.status(200).json({
      success: true,
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all cases (for investigator or admin)
// @route   GET /api/v1/cases
// @access  Private (Public Safety Officer/Admin)
const getAllCases = async (req, res, next) => {
  try {
    const {
      status,
      severity,
      assignedOfficer,
      limit = 20,
      page = 1,
    } = req.query;

    const query = {};
    if (status) query.investigationStatus = status;
    if (severity) query.severity = severity;
    if (assignedOfficer) query.assignedOfficer = assignedOfficer;

    const skip = (page - 1) * limit;

    const cases = await CaseProgress.find(query)
      .populate('complaint', 'title description category priority')
      .populate('assignedOfficer', 'name email')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ registeredAt: -1 });

    const total = await CaseProgress.countDocuments(query);

    res.status(200).json({
      success: true,
      data: cases,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update case investigation status
// @route   PUT /api/v1/cases/:caseId/status
// @access  Private (Assigned Officer/Admin)
const updateCaseStatus = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { investigationStatus, message } = req.body;

    if (!investigationStatus) {
      return res.status(400).json({
        success: false,
        message: 'Investigation status is required',
      });
    }

    const caseProgress = await CaseProgress.findById(caseId);
    if (!caseProgress) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    // Check authorization
    if (
      caseProgress.assignedOfficer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this case',
      });
    }

    caseProgress.investigationStatus = investigationStatus;

    // Add to updates history
    if (message) {
      caseProgress.updates.push({
        status: investigationStatus,
        message,
        updatedAt: new Date(),
        updatedBy: req.user._id,
      });
    }

    // Update closure date if case is closed
    if (
      investigationStatus.includes('closed') &&
      !caseProgress.actualClosureDate
    ) {
      caseProgress.actualClosureDate = new Date();
    }

    await caseProgress.save();

    res.status(200).json({
      success: true,
      message: 'Case status updated successfully',
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add evidence to case
// @route   POST /api/v1/cases/:caseId/evidence
// @access  Private (Assigned Officer/Admin)
const addEvidence = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { description, type, url } = req.body;

    if (!description || !type || !url) {
      return res.status(400).json({
        success: false,
        message: 'Description, type, and URL are required',
      });
    }

    const caseProgress = await CaseProgress.findById(caseId);
    if (!caseProgress) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    caseProgress.evidenceCollected.push({
      description,
      type,
      url,
      collectedAt: new Date(),
      collectedBy: req.user._id,
    });

    await caseProgress.save();

    res.status(200).json({
      success: true,
      message: 'Evidence added successfully',
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add witness statement
// @route   POST /api/v1/cases/:caseId/witnesses
// @access  Private (Assigned Officer/Admin)
const addWitness = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { name, contact, statement } = req.body;

    if (!name || !statement) {
      return res.status(400).json({
        success: false,
        message: 'Witness name and statement are required',
      });
    }

    const caseProgress = await CaseProgress.findById(caseId);
    if (!caseProgress) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    caseProgress.witnesses.push({
      name,
      contact,
      statement,
      recordedAt: new Date(),
    });

    await caseProgress.save();

    res.status(200).json({
      success: true,
      message: 'Witness added successfully',
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record suspect information
// @route   POST /api/v1/cases/:caseId/suspects
// @access  Private (Assigned Officer/Admin)
const recordSuspect = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { name, description, status, arrestWarrant, arrestDate } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Suspect name and description are required',
      });
    }

    const caseProgress = await CaseProgress.findById(caseId);
    if (!caseProgress) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    caseProgress.suspects.push({
      name,
      description,
      status: status || 'identified',
      arrestWarrant: arrestWarrant || false,
      arrestDate: arrestDate ? new Date(arrestDate) : undefined,
    });

    await caseProgress.save();

    res.status(200).json({
      success: true,
      message: 'Suspect recorded successfully',
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign case to officer
// @route   PUT /api/v1/cases/:caseId/assign
// @access  Private (Admin/Public Safety Director)
const assignCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { officerId } = req.body;

    if (!officerId) {
      return res.status(400).json({
        success: false,
        message: 'Officer ID is required',
      });
    }

    const caseProgress = await CaseProgress.findByIdAndUpdate(
      caseId,
      {
        assignedOfficer: officerId,
        investigationStartDate: new Date(),
      },
      { new: true }
    );

    if (!caseProgress) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Case assigned successfully',
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add court case information
// @route   PUT /api/v1/cases/:caseId/court
// @access  Private (Assigned Officer/Admin)
const updateCourtInfo = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const { caseNumber, courtName, filedDate, nextHearing, status } = req.body;

    const caseProgress = await CaseProgress.findById(caseId);
    if (!caseProgress) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    caseProgress.courtCase = {
      caseNumber,
      courtName,
      filedDate: filedDate ? new Date(filedDate) : undefined,
      nextHearing: nextHearing ? new Date(nextHearing) : undefined,
      status,
    };

    await caseProgress.save();

    res.status(200).json({
      success: true,
      message: 'Court information updated successfully',
      data: caseProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assigned cases for current officer
// @route   GET /api/v1/cases/my-cases
// @access  Private (Public Safety Officer)
const getMyAssignedCases = async (req, res, next) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;

    const query = { assignedOfficer: req.user._id };
    if (status) query.investigationStatus = status;

    const skip = (page - 1) * limit;

    const cases = await CaseProgress.find(query)
      .populate('complaint', 'title description priority category')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ registeredAt: -1 });

    const total = await CaseProgress.countDocuments(query);

    res.status(200).json({
      success: true,
      data: cases,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerCase,
  getCaseProgress,
  getAllCases,
  updateCaseStatus,
  addEvidence,
  addWitness,
  recordSuspect,
  assignCase,
  updateCourtInfo,
  getMyAssignedCases,
};
