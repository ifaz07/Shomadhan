/**
 * Reputation Routes
 * 
 * API endpoints for user reputation and badges.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const User = require('../models/User.model');
const { getAllBadges, getBadgeProgress, calculateCredibilityScore } = require('../services/reputationService');

// All routes require authentication
router.use(protect);

// Get current user's reputation and badges
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        reputation: user.reputation || 0,
        credibilityScore: user.credibilityScore || 50,
        badges: user.badges || [],
        reputationBreakdown: user.reputationBreakdown || {},
        reportingStreak: user.reportingStreak || { current: 0, longest: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get badge progress for current user
router.get('/me/badges', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const progress = getBadgeProgress(user);

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
});

// Get all available badges
router.get('/badges', (req, res) => {
  const badges = getAllBadges();
  res.status(200).json({ success: true, data: badges });
});

// Get user's reputation by ID (admin/mayor only)
router.get('/user/:userId', protect, authorize('admin', 'mayor'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        reputation: user.reputation || 0,
        credibilityScore: user.credibilityScore || 50,
        badges: user.badges || [],
        reputationBreakdown: user.reputationBreakdown || {},
        reportingStreak: user.reportingStreak || { current: 0, longest: 0 },
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get top reputation leaders
router.get('/leaders', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const leaders = await User.find({ role: 'citizen' })
      .select('name reputation credibilityScore badges')
      .sort('-reputation')
      .limit(limit);

    res.status(200).json({
      success: true,
      count: leaders.length,
      data: leaders,
    });
  } catch (error) {
    next(error);
  }
});

// Recalculate credibility score (admin only)
router.post('/recalculate/:userId', protect, authorize('admin', 'mayor'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Recalculate credibility score
    user.credibilityScore = calculateCredibilityScore(user);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Credibility score recalculated',
      data: {
        credibilityScore: user.credibilityScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;