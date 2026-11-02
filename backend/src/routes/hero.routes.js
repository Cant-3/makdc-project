const express = require('express');
const router = express.Router();
const heroController = require('../controllers/hero.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// PUBLIC
router.get('/', heroController.listPublic);

// ADMIN
router.use(authenticate);
router.get('/admin', requireRole('SuperAdmin', 'CEO'), heroController.listAdmin);
router.post('/', requireRole('SuperAdmin', 'CEO'), heroController.createSlide);
router.put('/:id', requireRole('SuperAdmin', 'CEO'), heroController.updateSlide);
router.delete('/:id', requireRole('SuperAdmin', 'CEO'), heroController.deleteSlide);

module.exports = router;