const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/mayor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/dashboard-stats', protect, authorize('mayor'), getDashboardStats);

module.exports = router;
