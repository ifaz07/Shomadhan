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
} = require('../controllers/complaint.controller');

// NLP analysis preview (before submission)
router.post('/analyze', protect, analyzeComplaint);

// Submit complaint - allowed for authenticated users (can choose to be anonymous)
router.post('/', protect, upload.array('evidence', 5), createComplaint);

// Get complaints (their own or all for admin)
router.get('/', protect, getComplaints);

// Get single complaint
router.get('/:id', protect, getComplaint);

// Update complaint
router.put('/:id', protect, updateComplaint);

// Delete complaint
router.delete('/:id', protect, deleteComplaint);

module.exports = router;
