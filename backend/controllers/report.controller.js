/**
 * Report Controller
 * 
 * Handles API endpoints for PDF report generation.
 */

const Complaint = require('../models/Complaint.model');
const {
  generateComplaintReport,
  generateSummaryReport,
} = require('../services/pdfReportService');

// @desc    Generate PDF report for individual complaint
// @route   GET /api/v1/reports/complaint/:id
// @access  Private (admin, mayor, department_officer)
const getComplaintReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if complaint exists
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Check authorization (admin/mayor can view all, department_officer can view assigned, user can view own)
    const userRole = req.user.role;
    const isAdmin = userRole === 'admin' || userRole === 'mayor';
    const isOwner = complaint.user?.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate report for this complaint',
      });
    }

    // Generate PDF
    const pdfBuffer = await generateComplaintReport(id);

    // Set response headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="complaint-${complaint.ticketId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate PDF summary report for date range
// @route   GET /api/v1/reports/summary
// @access  Private (admin, mayor)
const getSummaryReport = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before endDate',
      });
    }

    // Determine report type
    const reportType = type || 'monthly';

    // Generate PDF
    const pdfBuffer = await generateSummaryReport(startDate, endDate, reportType);

    // Set response headers for PDF download
    const filename = `summary-${reportType}-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.pdf`;
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Get report preview (JSON data without PDF)
// @route   GET /api/v1/reports/complaint/:id/preview
// @access  Private (admin, mayor, department_officer)
const getComplaintReportPreview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate('user', 'name email phone')
      .populate('escalation.escalatedBy', 'name')
      .populate('history.updatedBy', 'name');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Check authorization
    const userRole = req.user.role;
    const isAdmin = userRole === 'admin' || userRole === 'mayor';
    const isOwner = complaint.user?.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this complaint report',
      });
    }

    // Return preview data
    res.status(200).json({
      success: true,
      data: {
        ticketId: complaint.ticketId,
        title: complaint.title,
        description: complaint.description,
        status: complaint.status,
        priority: complaint.priority,
        category: complaint.category,
        location: complaint.location,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
        sla: complaint.sla,
        escalation: complaint.escalation,
        escalationHistory: complaint.escalationHistory,
        history: complaint.history,
        evidence: complaint.evidence,
        voteCount: complaint.voteCount,
        nlpAnalysis: complaint.nlpAnalysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get summary report preview (JSON data without PDF)
// @route   GET /api/v1/reports/summary/preview
// @access  Private (admin, mayor)
const getSummaryReportPreview = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
      });
    }

    // Get complaint statistics
    const complaints = await Complaint.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const totalComplaints = complaints.length;
    const byStatus = {};
    const byPriority = {};
    const byCategory = {};
    let resolvedCount = 0;
    let breachedCount = 0;

    complaints.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (c.status === 'resolved') resolvedCount++;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      if (c.sla?.breached) breachedCount++;
    });

    const resolutionRate = totalComplaints > 0 ? ((resolvedCount / totalComplaints) * 100).toFixed(1) : 0;
    const slaComplianceRate = totalComplaints > 0 ? (((totalComplaints - breachedCount) / totalComplaints) * 100).toFixed(1) : 100;

    res.status(200).json({
      success: true,
      data: {
        period: { startDate, endDate, type: type || 'monthly' },
        totalComplaints,
        resolvedCount,
        resolutionRate,
        slaComplianceRate,
        breachedCount,
        byStatus,
        byPriority,
        byCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComplaintReport,
  getSummaryReport,
  getComplaintReportPreview,
  getSummaryReportPreview,
};