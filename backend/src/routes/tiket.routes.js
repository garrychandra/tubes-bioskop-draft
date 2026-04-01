const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tiket.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/buy', authenticate, ctrl.buy);
router.get('/my', authenticate, ctrl.getMyTransactions);
router.get('/verify/:barcode', ctrl.verify);
router.post('/use/:barcode', authenticate, ctrl.markUsed);
router.get('/:id/barcode', authenticate, ctrl.getBarcode);

module.exports = router;
