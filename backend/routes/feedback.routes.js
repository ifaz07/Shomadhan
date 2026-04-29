/**
 * Feedback Routes
 * 
 * API endpoints for citizen feedback and ratings.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  submitFeedback,
  getFeedback,
  getUserFeedback,
  updateFeedback,
} = require('../controllers/feedback.controller');

// All routes require authentication
router.use(protect);

// Submit feedback for a resolved complaint
router.post('/:complaintId', submitFeedback);

// Get feedback for a complaint
router.get('/:complaintId', getFeedback);

// Get current user's given feedback
router.get('/user/me', getUserFeedback);

// Update feedback for a complaint
router.put('/:complaintId', updateFeedback);

module.exports = router;