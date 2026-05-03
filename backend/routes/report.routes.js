const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getComplaintReport, getSummaryReport } = require('../controllers/report.controller');

router.use(protect);

router.get('/complaint/:id', getComplaintReport);
router.get('/summary', getSummaryReport);

module.exports = router;
