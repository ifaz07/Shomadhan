const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  getDepartmentComplaints,
  getDepartmentComplaintById,
  getDepartmentStats,
  updateComplaintStatus,
  setComplaintSLA,
} = require("../controllers/servant.controller");

// All servant routes require login + department_officer role
router.use(protect, authorize("department_officer"));

router.get("/stats", getDepartmentStats);
router.get("/complaints", getDepartmentComplaints);
router.get("/complaints/:id", getDepartmentComplaintById);
router.put("/complaints/:id/status", updateComplaintStatus);
router.put("/complaints/:id/sla", setComplaintSLA);

module.exports = router;
