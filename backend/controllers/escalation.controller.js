/**
 * Escalation Controller
 * 
 * Handles API endpoints for escalation management.
 */

const Complaint = require('../models/Complaint.model');
const {
  processOverdueComplaints: processOverdue,
  getEscalationStats: getStats,
  getEscalationQueue: getQueue,
  escalateComplaint: escalateComplaintService,
} = require('../services/escalationService');

// @desc    Manually trigger overdue complaint processing
// @route   POST /api/v1/escalations/process
// @access  Private (admin, mayor)
const processOverdueComplaints = async (req, res, next) => {
  try {
    const result = await processOverdue();
    res.status(200).json({
      success: true,
      message: 'Overdue complaint processing completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get escalation statistics
// @route   GET /api/v1/escalations/stats
// @access  Private (admin, mayor)
const getEscalationStats = async (req, res, next) => {
  try {
    const stats = await getStats();
    
    // Format response
    const formattedStats = stats.reduce((acc, item) => {
      acc[item._id || 'initial'] = {
        total: item.count,
        overdue: item.overdue,
        breached: item.breached,
      };
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complaints at a specific escalation level
// @route   GET /api/v1/escalations/queue/:level
// @access  Private (admin, mayor, department_officer)
const getEscalationQueue = async (req, res, next) => {
  try {
    const { level } = req.params;
    const validLevels = ['initial', 'level1', 'level2', 'level3', 'mayor'];
    
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: `Invalid escalation level. Valid levels: ${validLevels.join(', ')}`,
      });
    }
    
    const complaints = await getQueue(level);
    
    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually escalate a complaint
// @route   POST /api/v1/escalations/:complaintId/escalate
// @access  Private (admin, mayor)
const escalateComplaintManual = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { reason, notes } = req.body;
    
    const complaint = await Complaint.findById(complaintId);
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }
    
    if (complaint.status === 'resolved' || complaint.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot escalate resolved or rejected complaints',
      });
    }
    
    // Escalate the complaint
    await escalateComplaintService(
      complaint,
      reason || 'Manual escalation by authority',
      req.user._id,
      false, // Not auto-escalated
      notes || ''
    );
    
    res.status(200).json({
      success: true,
      message: 'Complaint escalated successfully',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processOverdueComplaints,
  getEscalationStats,
  getEscalationQueue,
  escalateComplaintManual,
};