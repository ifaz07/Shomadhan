const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
  deployResource,
  releaseResource,
  getAvailableResources,
  getResourceSuggestions,
  getResourceStats,
} = require('../controllers/resource.controller');

// ── Public routes ─────────────────────────────────────────────────────────
router.get('/available', getAvailableResources);
router.get('/stats', getResourceStats);

// ── Protected routes ───────────────────────────────────────────────────
router.post('/', protect, authorize('admin', 'servant'), createResource);
router.get('/', protect, getResources);
router.get('/suggestions', protect, authorize('admin', 'servant'), getResourceSuggestions);
router.get('/:id', protect, getResource);
router.put('/:id', protect, authorize('admin', 'servant'), updateResource);
router.delete('/:id', protect, authorize('admin', 'servant'), deleteResource);
router.post('/:id/deploy', protect, authorize('admin', 'servant'), deployResource);
router.post('/:id/release', protect, authorize('admin', 'servant'), releaseResource);

module.exports = router;