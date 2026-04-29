/**
 * Escalation Routes
 * 
 * API endpoints for escalation management and monitoring.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  processOverdueComplaints,
  getEscalationStats,
  getEscalationQueue,
  escalateComplaintManual,
} = require('../controllers/escalation.controller');

// Process overdue complaints (can be triggered manually or scheduled)
// Route: POST /api/v1/escalations/process
router.post('/process', protect, authorize('admin', 'mayor'), processOverdueComplaints);

// Get escalation statistics
// Route: GET /api/v1/escalations/stats
router.get('/stats', protect, authorize('admin', 'mayor'), getEscalationStats);

// Get complaints at a specific escalation level
// Route: GET /api/v1/escalations/queue/:level
router.get('/queue/:level', protect, authorize('admin', 'mayor', 'department_officer'), getEscalationQueue);

// Manual escalation endpoint
// Route: POST /api/v1/escalations/:complaintId/escalate
router.post('/:complaintId/escalate', protect, authorize('admin', 'mayor'), escalateComplaintManual);

module.exports = router;