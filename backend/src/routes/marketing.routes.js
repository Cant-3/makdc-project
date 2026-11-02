// ================================================================
// MAK DC INVESTMENT — MARKETING ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const marketingController = require('../controllers/marketing.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// AUTHENTICATED ROUTES
// ================================================================
router.use(authenticate);

// Roles zinazoruhusiwa
const ALLOWED = ['Sales', 'Manager', 'CEO', 'SuperAdmin'];

// GET /api/marketing-plans — List all
router.get('/',
    requireRole(...ALLOWED),
    marketingController.listMarketingPlans
);

// GET /api/marketing-plans/:id — Get one
router.get('/:id',
    requireRole(...ALLOWED),
    marketingController.getMarketingPlan
);

// POST /api/marketing-plans — Create
router.post('/',
    requireRole(...ALLOWED),
    marketingController.createMarketingPlan
);

// PUT /api/marketing-plans/:id — Update
router.put('/:id',
    requireRole(...ALLOWED),
    marketingController.updateMarketingPlan
);

// PUT /api/marketing-plans/:id/progress — Quick progress update
router.put('/:id/progress',
    requireRole(...ALLOWED),
    marketingController.updateProgress
);

// DELETE /api/marketing-plans/:id — Delete
router.delete('/:id',
    requireRole('Sales', 'Manager', 'CEO', 'SuperAdmin'),   // ← Ongeza Sales
    marketingController.deleteMarketingPlan
);
// GET /api/marketing-plans/:id/orders — Linked orders
router.get('/:id/orders',
    requireRole(...ALLOWED),
    marketingController.getLinkedOrders
);
const activityRoutes = require('./marketingActivity.routes');
router.use('/:planId/activities', activityRoutes);

module.exports = router;