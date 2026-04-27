const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createBroadcast,
  getBroadcasts,
  getBroadcast,
  updateBroadcast,
  cancelBroadcast,
  getGeoTargetedBroadcasts,
  markAsRead,
  getActiveEmergencies,
} = require('../controllers/emergencyBroadcast.controller');

// ── Public routes ─────────────────────────────────────────────────────────
router.get('/active', getActiveEmergencies);
router.get('/nearby', getGeoTargetedBroadcasts);

// ── Protected routes ───────────────────────────────────────────────────
// All emergency broadcast routes require authentication
router.post('/', protect, authorize('admin', 'servant'), createBroadcast);
router.get('/', protect, getBroadcasts);
router.get('/:id', protect, getBroadcast);
router.put('/:id', protect, authorize('admin', 'servant'), updateBroadcast);
router.patch('/:id/cancel', protect, authorize('admin', 'servant'), cancelBroadcast);
router.post('/:id/read', protect, markAsRead);

module.exports = router;