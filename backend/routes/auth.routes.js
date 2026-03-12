const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  register, login, logout, getMe, changePassword, verifyAccount,
  oauthCallback, forgotPassword, resetPassword,
} = require('../controllers/auth.controller');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const { protect } = require('../middleware/auth.middleware');
const verifyUpload = require('../middleware/verifyUpload.middleware');

// ─── Local auth ───────────────────────────────────────────────────────
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/verify', protect, verifyUpload.single('file'), verifyAccount);

// ─── Password reset ───────────────────────────────────────────────────
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// ─── Google OAuth ─────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
  }),
  oauthCallback
);

// ─── Facebook OAuth ───────────────────────────────────────────────────
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=facebook_failed`,
  }),
  oauthCallback
);

module.exports = router;
