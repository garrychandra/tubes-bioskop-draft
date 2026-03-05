const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/schedules.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/:id/seats', ctrl.getSeatsForSchedule);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
