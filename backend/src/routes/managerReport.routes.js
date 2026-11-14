const express = require('express');
const router = express.Router();
const controller = require('../controllers/managerReport.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// Metrics
router.get('/metrics', authenticate, requireRole('Manager'), controller.generateMetrics);

// CRUD
router.post('/', authenticate, requireRole('Manager'), controller.createReport);
router.get('/', authenticate, requireRole('Manager', 'CEO'), controller.getReports);
router.get('/:id', authenticate, requireRole('Manager', 'CEO'), controller.getReportById);

// CEO Review
router.put('/:id/review', authenticate, requireRole('CEO'), controller.reviewReport);

module.exports = router;