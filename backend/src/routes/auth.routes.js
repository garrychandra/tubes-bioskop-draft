const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', require('../middleware/auth').authenticate, ctrl.getMe);
router.put('/change-password', require('../middleware/auth').authenticate, ctrl.changePassword);
router.post('/reset-password', ctrl.resetPassword);

module.exports = router;
