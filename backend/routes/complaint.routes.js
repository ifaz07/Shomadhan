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
  getComplaints,
  getComplaint,
  updateComplaint,
  deleteComplaint,
} = require('../controllers/complaint.controller');

// NLP analysis preview (before submission)
router.post('/analyze', protect, analyzeComplaint);

// Heatmap data (must be before /:id to avoid route conflict)
router.get('/heatmap', protect, getHeatmapData);

// Nearby complaints for pre-submission duplicate detection
router.get('/nearby', protect, getNearbyComplaints);

// Submit complaint
router.post('/', protect, upload.array('evidence', 5), createComplaint);

// Get complaints (own or all for admin)
router.get('/', protect, getComplaints);

// Vote / un-vote a complaint
router.post('/:id/vote', protect, voteComplaint);

// Get single complaint
router.get('/:id', protect, getComplaint);

// Update complaint
router.put('/:id', protect, updateComplaint);

// Delete complaint
router.delete('/:id', protect, deleteComplaint);

module.exports = router;
