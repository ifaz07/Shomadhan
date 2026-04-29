const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  createComplaint,
  analyzeComplaint,
  getComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
  voteComplaint,
  getNearbyComplaints,
  getHeatmapData,
} = require('../controllers/complaint.controller');

// Analyze complaint text with NLP (no save)
router.post('/analyze', protect, analyzeComplaint);

// Submit complaint - allowed for authenticated users (can choose to be anonymous)
router.post('/', protect, upload.array('evidence', 5), createComplaint);

// Pre-submit nearby check (query params: lat, lng, radius, category)
router.get('/nearby', protect, getNearbyComplaints);

// Heatmap data for frontend
router.get('/heatmap', protect, getHeatmapData);

// Vote toggle
router.post('/:id/vote', protect, voteComplaint);

// Get complaints (their own or all for admin)
router.get('/', protect, getComplaints);

// Get single complaint
router.get('/:id', protect, getComplaint);

// Update complaint
router.put('/:id', protect, updateComplaint);

// Delete complaint
router.delete('/:id', protect, deleteComplaint);

module.exports = router;
