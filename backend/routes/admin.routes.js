const express = require('express');
const router = express.Router();
const { 
  getPendingMayors, 
  approveMayor, 
  getUsersByRole, 
  deleteUser,
  getPendingVerifications,
  approveVerification
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/pending-mayors', getPendingMayors);
router.put('/approve-mayor/:id', approveMayor);
router.get('/pending-verifications', getPendingVerifications);
router.put('/approve-verification/:id', approveVerification);
router.get('/users', getUsersByRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
