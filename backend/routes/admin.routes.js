const express = require('express');
const router = express.Router();
const { 
  getPendingMayors, 
  getPendingServants,
  approveMayor, 
  approveServant,
  getUsersByRole, 
  deleteUser,
  getPendingVerifications,
  approveVerification
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/pending-mayors', getPendingMayors);
router.get('/pending-servants', getPendingServants);
router.put('/approve-mayor/:id', approveMayor);
router.put('/approve-servant/:id', approveServant);
router.get('/pending-verifications', getPendingVerifications);
router.put('/approve-verification/:id', approveVerification);
router.get('/users', getUsersByRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
