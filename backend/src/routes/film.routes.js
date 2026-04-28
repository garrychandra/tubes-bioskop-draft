const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/film.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authenticate, requireAdmin, upload.single('poster'), ctrl.create);
router.put('/:id', authenticate, requireAdmin, upload.single('poster'), ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
