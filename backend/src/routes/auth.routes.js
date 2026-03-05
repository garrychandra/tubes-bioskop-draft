const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', require('../middleware/auth').authenticate, ctrl.getMe);

module.exports = router;
