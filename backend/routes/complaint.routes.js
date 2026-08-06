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
router.get('/nearby', protect, getNearbyComplaints);
router.get('/feedback/all', protect, getAllFeedback);

const uploadOptionalAudio = (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.warn('[Analyze Audio Upload Warning]:', err.message);
    }
    next();
  });
};

// ── Protected routes ──────────────────────────────────────────────────────
router.get('/stats', protect, getPublicStats);
router.post('/analyze', protect, uploadOptionalAudio, analyzeComplaint);
router.post('/', protect, upload.fields([{ name: 'evidence', maxCount: 5 }, { name: 'voiceDescription', maxCount: 1 }]), createComplaint);
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
