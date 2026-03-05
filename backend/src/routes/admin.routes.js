const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/stats', ctrl.getStats);
router.get('/income', ctrl.getIncome);
router.get('/orders', ctrl.getOrders);
router.get('/users', ctrl.getUsers);
router.put('/users/:id/role', ctrl.updateUserRole);

module.exports = router;
