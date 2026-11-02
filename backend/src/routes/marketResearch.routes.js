// ================================================================
// MAK DC INVESTMENT — MARKET RESEARCH ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const researchController = require('../controllers/marketResearch.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// AUTHENTICATED ROUTES
// ================================================================
router.use(authenticate);

const ALLOWED = ['Sales', 'Manager', 'CEO', 'SuperAdmin'];

// GET /api/market-research
router.get('/', requireRole(...ALLOWED), researchController.listResearch);

// GET /api/market-research/:id
router.get('/:id', requireRole(...ALLOWED), researchController.getResearch);

// POST /api/market-research
router.post('/', requireRole(...ALLOWED), researchController.createResearch);

// PUT /api/market-research/:id
router.put('/:id', requireRole(...ALLOWED), researchController.updateResearch);

// DELETE /api/market-research/:id
router.delete('/:id', requireRole(...ALLOWED), researchController.deleteResearch);

module.exports = router;