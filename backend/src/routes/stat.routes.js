const express = require('express');
const router = express.Router();
const statController = require('../controllers/stat.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// PUBLIC
router.get('/', statController.listPublic);

// ADMIN
router.use(authenticate);
router.get('/admin', requireRole('SuperAdmin', 'CEO'), statController.listAdmin);
router.post('/', requireRole('SuperAdmin', 'CEO'), statController.createStat);
router.put('/:id', requireRole('SuperAdmin', 'CEO'), statController.updateStat);
router.delete('/:id', requireRole('SuperAdmin', 'CEO'), statController.deleteStat);

module.exports = router;