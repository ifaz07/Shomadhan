const express = require("express");
const {
  createEmergencyBroadcast,
  getEmergencyBroadcasts,
} = require("../controllers/emergencyBroadcast.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

const upload = require("../middleware/upload.middleware");

router.use(protect);

router.get("/", getEmergencyBroadcasts);
router.post(
  "/",
  authorize("mayor", "department_officer"),
  upload.single("audio"),
  createEmergencyBroadcast
);

module.exports = router;
