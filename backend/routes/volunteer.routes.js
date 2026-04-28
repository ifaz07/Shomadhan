const express = require('express');
const router = express.Router();
const {
  createVolunteerAd,
  getActiveVolunteerAds,
  registerForVolunteer,
} = require('../controllers/volunteer.controller');
const volunteerUpload = require('../middleware/volunteerUpload.middleware');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', protect, authorize('mayor'), volunteerUpload.single('poster'), createVolunteerAd);
router.get('/active', getActiveVolunteerAds);
router.post('/:id/register', protect, registerForVolunteer);

module.exports = router;
