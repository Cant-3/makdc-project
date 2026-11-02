// ================================================================
// MAK DC INVESTMENT — FINANCIAL RESOURCE ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const controller = require('../controllers/financialResource.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ================================================================
// TRANSACTION ROUTES (must be BEFORE /:id)
// ================================================================

// GET transactions
router.get('/transactions',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    controller.getTransactions
);

// POST manual transaction
router.post('/transactions/manual',
    requireRole('Finance', 'SuperAdmin'),
    controller.createManualTransaction
);

// ================================================================
// STATS ROUTE (must be BEFORE /:id)
// ================================================================

router.get('/stats',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    controller.getStats
);

// ================================================================
// RESOURCE ROUTES
// ================================================================

// GET all resources
router.get('/',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    controller.listResources
);

// POST create resource
router.post('/',
    requireRole('Finance', 'SuperAdmin'),
    controller.createResource
);
// ================================================================
// MANUAL DEPOSIT — Finance, SuperAdmin
// ================================================================
router.post('/:id/deposit',
    requireRole('Finance', 'SuperAdmin'),
    controller.deposit
);

// ================================================================
// MANUAL WITHDRAW — Finance, SuperAdmin
// ================================================================
router.post('/:id/withdraw',
    requireRole('Finance', 'SuperAdmin'),
    controller.withdraw
);
router.get('/:id',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    controller.getResource
);

// PUT update resource
router.put('/:id',
    requireRole('Finance', 'SuperAdmin'),
    controller.updateResource
);

// 🆕 DELETE resource — MUHIMU
router.delete('/:id',
    requireRole('Finance', 'SuperAdmin'),
    controller.deleteResource
);

// PUT close resource (optional)
router.put('/:id/close',
    requireRole('Finance', 'SuperAdmin'),
    controller.closeResource
);
// 🆕 AUTO-SETUP MAIN CASH
router.post('/auto-setup',
    requireRole('Finance', 'SuperAdmin', 'CEO'),
    controller.autoSetupMainCash
);

module.exports = router;