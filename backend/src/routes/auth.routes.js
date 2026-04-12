const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');

// ─── Strict rate limiter for sensitive auth endpoints ────────────────────────
// 5 requests per 15 minutes per IP.  This mitigates:
//   - Credential stuffing on /login
//   - Account enumeration / OTP guessing on /forgot-password + /verify-otp
//   - Spam registrations on /register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes before trying again.' },
});

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.get('/me', require('../middleware/auth').authenticate, ctrl.getMe);
router.put('/change-password', require('../middleware/auth').authenticate, ctrl.changePassword);

// Forgot password — 3-step OTP flow (also rate-limited)
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/verify-otp', authLimiter, ctrl.verifyOtp);
router.post('/reset-password', ctrl.resetPassword);

module.exports = router;
