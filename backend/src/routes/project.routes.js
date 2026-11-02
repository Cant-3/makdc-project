// ================================================================
// MAK DC INVESTMENT — PROJECT ROUTES
// ================================================================
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// PUBLIC ROUTES
// ================================================================
router.get('/', projectController.listPublic);

// ================================================================
// ADMIN ROUTES
// ================================================================
router.use(authenticate);

router.get('/admin', requireRole('SuperAdmin', 'CEO'), projectController.listAdmin);
router.get('/:id', requireRole('SuperAdmin', 'CEO'), projectController.getOne);
router.post('/', requireRole('SuperAdmin', 'CEO'), projectController.createProject);
router.put('/:id', requireRole('SuperAdmin', 'CEO'), projectController.updateProject);
router.delete('/:id', requireRole('SuperAdmin', 'CEO'), projectController.deleteProject);

module.exports = router;