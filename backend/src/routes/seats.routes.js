const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/seats.controller');
const { authenticate } = require('../middleware/auth');

// Lock/unlock seats during checkout
router.post('/lock', authenticate, ctrl.lockSeats);
router.post('/unlock', authenticate, ctrl.unlockSeats);

module.exports = router;
