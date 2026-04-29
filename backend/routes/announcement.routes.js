const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createAnnouncement,
  publishAnnouncement,
  getAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  getMyAnnouncements,
  addAnnouncementUpdate,
  pinAnnouncement,
} = require('../controllers/announcement.controller');

// Public routes
router.get('/', getAnnouncements);
router.get('/:announcementId', getAnnouncement);

// Protected routes - require authentication
router.post('/', protect, authorize('mayor', 'admin', 'department_officer'), createAnnouncement);

// My announcements (for creators)
router.get('/my-announcements', protect, getMyAnnouncements);

// Update operations (require authorization)
router.put(
  '/:announcementId/publish',
  protect,
  authorize('mayor', 'admin', 'department_officer'),
  publishAnnouncement
);

router.put(
  '/:announcementId',
  protect,
  authorize('mayor', 'admin', 'department_officer'),
  updateAnnouncement
);

router.delete(
  '/:announcementId',
  protect,
  authorize('mayor', 'admin', 'department_officer'),
  archiveAnnouncement
);

router.post(
  '/:announcementId/updates',
  protect,
  authorize('mayor', 'admin', 'department_officer'),
  addAnnouncementUpdate
);

router.put(
  '/:announcementId/pin',
  protect,
  authorize('admin', 'mayor'),
  pinAnnouncement
);

module.exports = router;
