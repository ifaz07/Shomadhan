/**
 * Feedback Controller
 * 
 * Handles citizen feedback and rating for resolved complaints.
 */

const Complaint = require('../models/Complaint.model');
const User = require('../models/User.model');
const { awardBadges, calculateCredibilityScore } = require('../services/reputationService');

// @desc    Submit feedback for a resolved complaint
// @route   POST /api/v1/feedback/:complaintId
// @access  Private (complaint owner)
const submitFeedback = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { resolutionQuality, responseTime, officerProfessionalism, comment } = req.body;

    // Validate ratings
    if (!resolutionQuality || !responseTime || !officerProfessionalism) {
      return res.status(400).json({
        success: false,
        message: 'All rating fields are required (resolutionQuality, responseTime, officerProfessionalism)',
      });
    }

    // Validate rating values (1-5)
    const ratings = [resolutionQuality, responseTime, officerProfessionalism];
    for (const rating of ratings) {
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({
          success: false,
          message: 'Ratings must be integers between 1 and 5',
        });
      }
    }

    // Find complaint
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Check if user is the owner
    if (complaint.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to provide feedback for this complaint',
      });
    }

    // Check if complaint is resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be provided for resolved complaints',
      });
    }

    // Check if feedback already submitted
    if (complaint.feedback?.isRated) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this complaint',
      });
    }

    // Calculate overall rating (average of all ratings)
    const overallRating = (resolutionQuality + responseTime + officerProfessionalism) / 3;

    // Update complaint with feedback
    complaint.feedback = {
      isRated: true,
      ratings: {
        resolutionQuality,
        responseTime,
        officerProfessionalism,
      },
      overallRating: Math.round(overallRating * 10) / 10,
      comment: comment || '',
      feedbackBy: req.user._id,
      feedbackAt: new Date(),
    };

    await complaint.save();

    // Update user reputation based on feedback
    const user = await User.findById(req.user._id);
    if (user) {
      // Add positive feedback count
      user.reputationBreakdown.feedbackPositive = (user.reputationBreakdown.feedbackPositive || 0) + 1;
      
      // Calculate reputation points from feedback (positive = +10, negative = -5)
      const feedbackPoints = overallRating >= 3 ? 10 : -5;
      user.reputation = (user.reputation || 0) + feedbackPoints;
      
      // Update credibility score
      user.credibilityScore = calculateCredibilityScore(user);
      
      // Check for badge awards
      await awardBadges(user);
      
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: complaint.feedback,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get feedback for a complaint
// @route   GET /api/v1/feedback/:complaintId
// @access  Private
const getFeedback = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId).select('feedback');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    if (!complaint.feedback?.isRated) {
      return res.status(404).json({
        success: false,
        message: 'No feedback found for this complaint',
      });
    }

    res.status(200).json({
      success: true,
      data: complaint.feedback,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's given feedback
// @route   GET /api/v1/feedback/user
// @access  Private
const getUserFeedback = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      'feedback.feedbackBy': req.user._id,
      'feedback.isRated': true,
    }).select('ticketId title feedback createdAt');

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update feedback for a complaint
// @route   PUT /api/v1/feedback/:complaintId
// @access  Private (complaint owner)
const updateFeedback = async (req, res, next) => {
  try {
    const { complaintId } = req.params;
    const { resolutionQuality, responseTime, officerProfessionalism, comment } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Check ownership
    if (complaint.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update feedback for this complaint',
      });
    }

    // Check if feedback exists
    if (!complaint.feedback?.isRated) {
      return res.status(400).json({
        success: false,
        message: 'No feedback to update. Please submit feedback first.',
      });
    }

    // Check if update is within 24 hours of feedback
    const feedbackTime = new Date(complaint.feedback.feedbackAt);
    const now = new Date();
    const hoursSinceFeedback = (now - feedbackTime) / (1000 * 60 * 60);

    if (hoursSinceFeedback > 24) {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be updated within 24 hours of submission',
      });
    }

    // Validate and update ratings
    if (resolutionQuality) {
      if (resolutionQuality < 1 || resolutionQuality > 5 || !Number.isInteger(resolutionQuality)) {
        return res.status(400).json({ success: false, message: 'Ratings must be integers between 1 and 5' });
      }
      complaint.feedback.ratings.resolutionQuality = resolutionQuality;
    }

    if (responseTime) {
      if (responseTime < 1 || responseTime > 5 || !Number.isInteger(responseTime)) {
        return res.status(400).json({ success: false, message: 'Ratings must be integers between 1 and 5' });
      }
      complaint.feedback.ratings.responseTime = responseTime;
    }

    if (officerProfessionalism) {
      if (officerProfessionalism < 1 || officerProfessionalism > 5 || !Number.isInteger(officerProfessionalism)) {
        return res.status(400).json({ success: false, message: 'Ratings must be integers between 1 and 5' });
      }
      complaint.feedback.ratings.officerProfessionalism = officerProfessionalism;
    }

    // Recalculate overall rating
    const { resolutionQuality: rq, responseTime: rt, officerProfessionalism: op } = complaint.feedback.ratings;
    complaint.feedback.overallRating = Math.round(((rq + rt + op) / 3) * 10) / 10;

    if (comment !== undefined) {
      complaint.feedback.comment = comment;
    }

    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Feedback updated successfully',
      data: complaint.feedback,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedback,
  getUserFeedback,
  updateFeedback,
};