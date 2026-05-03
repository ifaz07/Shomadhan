const express = require('express');
const router = express.Router();
const { handleTextExpansion } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/expand', protect, handleTextExpansion);

module.exports = router;
