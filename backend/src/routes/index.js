const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/movies', require('./movies.routes'));
router.use('/cinemas', require('./cinemas.routes'));
router.use('/schedules', require('./schedules.routes'));
router.use('/seats', require('./seats.routes'));
router.use('/tickets', require('./tickets.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
