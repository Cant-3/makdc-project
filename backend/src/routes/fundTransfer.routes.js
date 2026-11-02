// ================================================================
// MAK DC INVESTMENT — FUND TRANSFER ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const controller = require('../controllers/fundTransfer.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ================================================================
// LIST ALL TRANSFERS
// ================================================================
router.get('/',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    controller.listTransfers
);

// ================================================================
// CREATE TRANSFER (Finance)
// ================================================================
router.post('/',
    requireRole('Finance', 'SuperAdmin'),
    controller.createTransfer
);

// ================================================================
// UPDATE TRANSFER (Finance, draft only)
// ================================================================
router.put('/:id',
    requireRole('Finance', 'SuperAdmin'),
    controller.updateTransfer
);

// ================================================================
// SEND TO MANAGER (Finance)
// ================================================================
router.put('/:id/send-to-manager',
    requireRole('Finance', 'SuperAdmin'),
    controller.sendToManager
);

// ================================================================
// VERIFY (Manager)
// ================================================================
router.put('/:id/verify',
    requireRole('Manager', 'SuperAdmin'),
    controller.verifyTransfer
);

// ================================================================
// APPROVE (CEO)
// ================================================================
router.put('/:id/approve',
    requireRole('CEO', 'SuperAdmin'),
    controller.approveTransfer
);

// ================================================================
// EXECUTE (Finance) — MUHIMU
// ================================================================
router.put('/:id/execute',
    requireRole('Finance', 'SuperAdmin'),
    controller.executeTransfer
);

// ================================================================
// REJECT (Manager + CEO)
// ================================================================
router.put('/:id/reject',
    requireRole('Manager', 'CEO', 'SuperAdmin'),
    controller.rejectTransfer
);

// ================================================================
// DELETE (Finance, draft only)
// ================================================================
router.delete('/:id',
    requireRole('Finance', 'SuperAdmin'),
    controller.deleteTransfer
);

// ================================================================
// GET SINGLE (must be LAST)
// ================================================================
router.get('/:id',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    controller.getTransfer
);

module.exports = router;