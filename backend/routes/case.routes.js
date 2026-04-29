const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  registerCase,
  getCaseProgress,
  getAllCases,
  updateCaseStatus,
  addEvidence,
  addWitness,
  recordSuspect,
  assignCase,
  updateCourtInfo,
  getMyAssignedCases,
} = require('../controllers/case.controller');

// All case routes require authentication
router.use(protect);

// Public Safety Officer routes
router.post('/', authorize('public_safety', 'admin'), registerCase);
router.get('/:caseId', getCaseProgress);
router.put('/:caseId/status', authorize('public_safety', 'admin'), updateCaseStatus);
router.post('/:caseId/evidence', authorize('public_safety', 'admin'), addEvidence);
router.post('/:caseId/witnesses', authorize('public_safety', 'admin'), addWitness);
router.post('/:caseId/suspects', authorize('public_safety', 'admin'), recordSuspect);
router.put('/:caseId/court', authorize('public_safety', 'admin'), updateCourtInfo);

// My assigned cases
router.get('/my-cases', getMyAssignedCases);

// Admin routes
router.get('/', authorize('admin', 'mayor', 'public_safety'), getAllCases);
router.put('/:caseId/assign', authorize('admin', 'mayor'), assignCase);

module.exports = router;
