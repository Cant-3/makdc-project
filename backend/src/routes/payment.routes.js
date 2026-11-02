// ================================================================
// MAK DC INVESTMENT — PAYMENT ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// All payment routes require authentication
router.use(authenticate);

// ================================================================
// GET /api/payments — List all payments
// ================================================================
router.get('/',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance'),
    paymentController.listPayments
);

// ================================================================
// PUT /api/payments/:id/mark-paid — Mark payment as paid
// ================================================================
router.put('/:id/mark-paid',
    requireRole('Finance', 'SuperAdmin'),
    paymentController.markAsPaid
);

// ================================================================
// GET /api/payments/:id — Get single payment (must be LAST)
// ================================================================
router.get('/:id',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance'),
    paymentController.getPayment
);

module.exports = router;