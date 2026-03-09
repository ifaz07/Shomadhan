const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, changePassword, verifyAccount } = require('../controllers/auth.controller');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const { protect } = require('../middleware/auth.middleware');
const verifyUpload = require('../middleware/verifyUpload.middleware');

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/verify', protect, verifyUpload.single('file'), verifyAccount);

module.exports = router;
