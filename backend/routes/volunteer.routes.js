const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  registerVolunteer,
  getVolunteerProfile,
  updateVolunteerProfile,
  registerForAnnouncement,
  unregisterFromAnnouncement,
  getAllVolunteers,
  verifyVolunteer,
  getPendingVolunteerApplications,
  rateVolunteer,
} = require('../controllers/volunteer.controller');

// Public routes (require authentication)
router.post('/register', protect, registerVolunteer);
router.get('/profile', protect, getVolunteerProfile);
router.put('/profile', protect, updateVolunteerProfile);

// Announcement registration
router.post(
  '/announcements/:announcementId/register',
  protect,
  registerForAnnouncement
);
router.delete(
  '/announcements/:announcementId/register',
  protect,
  unregisterFromAnnouncement
);

// Admin/Authority routes
router.get('/', protect, authorize('admin', 'mayor'), getAllVolunteers);
router.get(
  '/pending/applications',
  protect,
  authorize('admin', 'mayor'),
  getPendingVolunteerApplications
);
router.put(
  '/:volunteerId/verify',
  protect,
  authorize('admin', 'mayor'),
  verifyVolunteer
);
router.put(
  '/:volunteerId/rate',
  protect,
  authorize('admin', 'mayor', 'department_officer'),
  rateVolunteer
);

module.exports = router;
