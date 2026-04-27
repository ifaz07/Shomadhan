const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  createComplaint,
  analyzeComplaint,
  voteComplaint,
  getNearbyComplaints,
  getHeatmapData,
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
} = require('../controllers/complaint.controller');

// ── Public routes (NO auth required) ─────────────────────────────────────
// IMPORTANT: Must come BEFORE /:id routes to prevent 'heatmap'/'nearby' matching as an ID
router.get('/heatmap', getHeatmapData);
router.get('/nearby', getNearbyComplaints);
router.get('/feedback/all', protect, getAllFeedback);

// ── Protected routes ──────────────────────────────────────────────────────
router.get('/stats', protect, getPublicStats);
router.post('/analyze', protect, analyzeComplaint);
router.post('/', protect, upload.array('evidence', 5), createComplaint);
router.get('/', protect, getComplaints);
router.post('/:id/vote', protect, voteComplaint);
router.get('/:id', protect, getComplaint);
router.put('/:id', protect, updateComplaint);
router.delete('/:id', protect, deleteComplaint);

router.post('/:complaintId/feedback', protect, submitFeedback);
router.get('/:complaintId/feedback/me', protect, getMyFeedbackForComplaint);
router.get('/:complaintId/feedback', getFeedbackForComplaint);
router.get('/:complaintId/feedback/stats', getFeedbackStats);

module.exports = router;
