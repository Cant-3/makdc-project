// ================================================================
// MAK DC INVESTMENT — REPORT ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// AUTHENTICATED ROUTES — Kila kitu kinahitaji token
// ================================================================
router.use(authenticate);

// ================================================================
// GET /api/reports/sales — Sales Summary (KPI cards)
// ================================================================
router.get('/sales',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'),
    reportController.getSalesSummary
);

// ================================================================
// GET /api/reports/sales/trend — Daily trend (charts)
// ================================================================
router.get('/sales/trend',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'),
    reportController.getSalesTrend
);

// ================================================================
// GET /api/reports/sales/top-products — Top products
// ================================================================
router.get('/sales/top-products',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'),
    reportController.getTopProducts
);

// ================================================================
// GET /api/reports/sales/top-regions — Revenue by region
// ================================================================
router.get('/sales/top-regions',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'),
    reportController.getTopRegions
);

// ================================================================
// GET /api/reports/sales/top-customers — Top customers
// ================================================================
router.get('/sales/top-customers',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'),
    reportController.getTopCustomers
);

// ================================================================
// EXPORT — MWISHO WA FAILI
// ================================================================
module.exports = router;