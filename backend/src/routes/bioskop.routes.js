const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bioskop.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Bioskop CRUD
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

// Studios under a bioskop
router.get('/:id/studios', ctrl.getStudios);
router.post('/:id/studios', authenticate, requireAdmin, ctrl.createStudio);
router.put('/:id/studios/:studioId', authenticate, requireAdmin, ctrl.updateStudio);
router.delete('/:id/studios/:studioId', authenticate, requireAdmin, ctrl.removeStudio);

module.exports = router;
