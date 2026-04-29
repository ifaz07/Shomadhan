const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getDashboardMetrics,
  getSLAComplianceMetrics,
  getDepartmentPerformanceMetrics,
  getCaseProgressData,
  getHeatmapAnalysisData,
  getIssuesTrendData,
  getTopIssuesData,
} = require('../controllers/dashboard.controller');

// The main dashboard metrics are for mayor/admin only.
router
  .route('/metrics')
  .get(protect, authorize('mayor', 'admin'), getDashboardMetrics);

// Other dashboard routes can be accessed by department officers as well.
router.use(protect, authorize('mayor', 'admin', 'department_officer'));

// Specific analytics endpoints
router.get('/sla-metrics', getSLAComplianceMetrics);
router.get('/department-performance', getDepartmentPerformanceMetrics);
router.get('/case-progress', getCaseProgressData);
router.get('/heatmap-analysis', getHeatmapAnalysisData);
router.get('/issues-trend', getIssuesTrendData);
router.get('/top-issues', getTopIssuesData);

module.exports = router;
