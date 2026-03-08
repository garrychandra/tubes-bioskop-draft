const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/film', require('./film.routes'));
router.use('/bioskop', require('./bioskop.routes'));
router.use('/jadwal', require('./jadwal.routes'));
router.use('/kursi', require('./kursi.routes'));
router.use('/seats', require('./kursi_locks.routes'));
router.use('/tiket', require('./tiket.routes'));
router.use('/rating', require('./rating.routes'));
router.use('/fnb', require('./fnb.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
