// ================================================================
// MAK DC INVESTMENT — PAYROLL ROUTES
// ================================================================
const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ================================================================
// GET all payrolls — Finance, Manager, CEO, SuperAdmin
// ================================================================
router.get('/',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    payrollController.getAllPayrolls
);

// ================================================================
// GET single payroll
// ================================================================
router.get('/:id',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    payrollController.getPayrollById
);

// ================================================================
// CREATE payroll — Finance pekee
// ================================================================
router.post('/',
    requireRole('Finance', 'SuperAdmin'),
    payrollController.createPayroll
);

// ================================================================
// UPDATE STATUS
// ================================================================
router.put('/:id/status',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    payrollController.updatePayrollStatus
);

// ================================================================
// DELETE
// ================================================================
router.delete('/:id',
    requireRole('Finance', 'SuperAdmin'),
    payrollController.deletePayroll
);

module.exports = router;