const express = require('express');
const router = express.Router();
const { handleTextExpansion } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimit.middleware');

router.post('/expand', protect, aiLimiter, handleTextExpansion);

module.exports = router;
