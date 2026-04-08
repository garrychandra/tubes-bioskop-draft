const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', require('../middleware/auth').authenticate, ctrl.getMe);
router.put('/change-password', require('../middleware/auth').authenticate, ctrl.changePassword);

// Forgot password — 3-step OTP flow
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/verify-otp', ctrl.verifyOtp);
router.post('/reset-password', ctrl.resetPassword);

module.exports = router;
