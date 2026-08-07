const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
  deployResource,
  returnResource,
  getOptimalDeploymentSuggestions,
  getResourceStats,
  scheduleMainenance,
  getNearbyResources,
} = require('../controllers/resource.controller');

// ── Public routes (NO auth required) ─────────────────────────────────────
// (None for resources - all require authentication)

// ── Protected routes ──────────────────────────────────────────────────────
// IMPORTANT: Specific routes must come BEFORE /:id routes

// Stats and suggestions
router.get('/suggestions/optimal-deployment', protect, getOptimalDeploymentSuggestions);
router.get('/stats', protect, getResourceStats);
router.get('/nearby', protect, getNearbyResources);

// CRUD operations
router.post('/', protect, createResource);
router.get('/', protect, getResources);
router.get('/:id', protect, getResource);
router.put('/:id', protect, updateResource);
router.delete('/:id', protect, deleteResource);

// Deployment operations
router.post('/:id/deploy', protect, deployResource);
router.post('/:id/return', protect, returnResource);
router.post('/:id/maintenance', protect, scheduleMainenance);

module.exports = router;
