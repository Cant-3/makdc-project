// ================================================================
// MAK DC INVESTMENT — COMPANY ACCOUNT ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const accountController = require('../controllers/account.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// All account routes require authentication
router.use(authenticate);

// ================================================================
// LIST ROUTES
// ================================================================
router.get('/',
    requireRole('Finance', 'CEO', 'Manager', 'SuperAdmin'),
    accountController.listAccounts
);

router.get('/approved',
    requireRole('Finance', 'CEO', 'Manager', 'SuperAdmin'),
    accountController.listApprovedAccounts
);

// ================================================================
// CREATE + UPDATE (Finance)
// ================================================================
router.post('/',
    requireRole('Finance', 'SuperAdmin'),
    accountController.createAccount
);

router.put('/:id',
    requireRole('Finance', 'Manager', 'SuperAdmin'),
    accountController.updateAccount
);

// ================================================================
// VERIFY (Manager)
// ================================================================
router.put('/:id/verify',
    requireRole('Manager', 'SuperAdmin'),
    accountController.verifyAccount
);

// ================================================================
// APPROVE (CEO)
// ================================================================
router.put('/:id/approve',
    requireRole('CEO', 'SuperAdmin'),
    accountController.approveAccount
);

// ================================================================
// REJECT (Manager + CEO)
// ================================================================
router.put('/:id/reject',
    requireRole('Manager', 'CEO', 'SuperAdmin'),
    accountController.rejectAccount
);

// ================================================================
// TOGGLE + DELETE (CEO + Manager)
// ================================================================
router.put('/:id/toggle-active',
    requireRole('CEO', 'Manager'),
    accountController.toggleActive
);

router.delete('/:id',
    requireRole('CEO', 'Manager'),
    accountController.deleteAccount
);

// ================================================================
// GET SINGLE (must be LAST)
// ================================================================
router.get('/:id',
    requireRole('Finance', 'CEO', 'Manager', 'SuperAdmin'),
    accountController.getAccount
);

// 🆕 Setup Main Cash (auto-create as draft)
router.post('/setup-main-cash',
    requireRole('Finance', 'SuperAdmin', 'CEO'),
    accountController.setupMainCash
);
module.exports = router;