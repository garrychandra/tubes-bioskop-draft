const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/kursi.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/studio/:studioId', ctrl.getByStudio);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
