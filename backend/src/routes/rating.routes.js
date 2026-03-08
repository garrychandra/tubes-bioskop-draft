const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rating.controller');
const { authenticate } = require('../middleware/auth');

router.get('/film/:filmId', ctrl.getByFilm);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
