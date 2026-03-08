const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/kursi_locks.controller');
const { authenticate } = require('../middleware/auth');

router.post('/lock', authenticate, ctrl.lockSeats);
router.post('/unlock', authenticate, ctrl.unlockSeats);

module.exports = router;
