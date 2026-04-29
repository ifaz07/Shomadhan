const express = require('express');
const router = express.Router();
const { getDashboardStats, getChatBriefing, getCitizensByPoints, announceGoodCitizen, removeGoodCitizenBadge } = require('../controllers/mayor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/dashboard-stats', protect, authorize('mayor'), getDashboardStats);
router.post('/chat-briefing', protect, authorize('mayor'), getChatBriefing);
router.get('/citizens-points', protect, authorize('mayor'), getCitizensByPoints);
router.post('/announce-winner', protect, authorize('mayor'), announceGoodCitizen);
router.post('/remove-badge/:id', protect, authorize('mayor'), removeGoodCitizenBadge);

module.exports = router;
