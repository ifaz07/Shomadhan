/**
 * Report Routes
 * 
 * API endpoints for PDF report generation.
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getComplaintReport,
  getSummaryReport,
  getComplaintReportPreview,
  getSummaryReportPreview,
} = require('../controllers/report.controller');

// All routes require authentication
router.use(protect);

// Preview routes (JSON data)
router.get('/complaint/:id/preview', authorize('admin', 'mayor', 'department_officer'), getComplaintReportPreview);
router.get('/summary/preview', authorize('admin', 'mayor'), getSummaryReportPreview);

// PDF download routes
router.get('/complaint/:id', authorize('admin', 'mayor', 'department_officer'), getComplaintReport);
router.get('/summary', authorize('admin', 'mayor'), getSummaryReport);

module.exports = router;