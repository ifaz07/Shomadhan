const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getDepartmentComplaints,
  getDepartmentStats,
  updateComplaintStatus,
} = require('../controllers/servant.controller');

// All servant routes require login + department_officer role
router.use(protect, authorize('department_officer'));

router.get('/stats', getDepartmentStats);
router.get('/complaints', getDepartmentComplaints);
router.put('/complaints/:id/status', updateComplaintStatus);

module.exports = router;
