const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  createComplaint,
  analyzeComplaint,
  getComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
  getHeatmapData,
  getNearbyComplaints,
  upvoteComplaint,
} = require('../controllers/complaint.controller');

// ── Public routes (NO auth required) ─────────────────────────────────────
// IMPORTANT: Must come BEFORE /:id routes to prevent 'heatmap'/'nearby' matching as an ID
router.get('/heatmap', getHeatmapData);
router.get('/nearby', getNearbyComplaints);

// ── Protected routes ──────────────────────────────────────────────────────
router.post('/analyze', protect, analyzeComplaint);
router.post('/', protect, upload.array('evidence', 5), createComplaint);
router.get('/', protect, getComplaints);
router.get('/:id', protect, getComplaint);
router.put('/:id', protect, updateComplaint);
router.delete('/:id', protect, deleteComplaint);
router.post('/:id/vote', protect, upvoteComplaint);

module.exports = router;
